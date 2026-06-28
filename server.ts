import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini API with Lazy Initialization to prevent startup crashes when the API key is missing
let aiInstance: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is missing. Please add it to your environment or Settings > Secrets.");
    }
    aiInstance = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiInstance;
}

// Helper to attempt model call with retries and backoff for transient 503/429 errors
async function attemptWithRetry(modelName: string, params: { contents: any; config?: any; }, retries = 2, delayMs = 800) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await getGeminiClient().models.generateContent({
        model: modelName,
        contents: params.contents,
        config: params.config,
      });
    } catch (error: any) {
      const errorMsg = error?.message || "";
      const errorStatus = error?.status || error?.code;
      const isTransient = errorStatus === 503 || 
                          errorStatus === 429 ||
                          errorMsg.includes("503") ||
                          errorMsg.includes("UNAVAILABLE") ||
                          errorMsg.includes("high demand") ||
                          errorMsg.includes("Resource exhausted") ||
                          errorMsg.includes("quota");

      if (isTransient && attempt < retries) {
        console.log(`[Transient Error] Model ${modelName} returned temporary error (attempt ${attempt + 1}/${retries + 1}). Retrying in ${delayMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        delayMs *= 2; // Exponential backoff
        continue;
      }
      throw error;
    }
  }
}

// Generate content with automatic multi-stage fallback on temporary failures / overload / quota issues
async function generateWithFallback(params: {
  contents: any;
  config?: any;
}) {
  const models = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
  let lastError: any = null;

  for (const modelName of models) {
    try {
      // Use attemptWithRetry which handles transient failures like 503 with exponential backoff
      return await attemptWithRetry(modelName, params);
    } catch (error: any) {
      lastError = error;
      console.log(`[Fallback] Model ${modelName} attempt failed. Error:`, error?.message || error);
    }
  }

  throw lastError;
}

// 5A: AI Task Prioritizer Endpoint
app.post("/api/prioritize", async (req, res) => {
  let tasks: any[] = [];
  try {
    tasks = req.body.tasks;
    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({ error: "Tasks list is required and cannot be empty" });
    }

    const todayStr = new Date().toISOString().split('T')[0];

    const prompt = `You are an AI Productivity Assistant for Chrono, the Last-Minute Life Saver app. 
    Analyze the following list of tasks and prioritize them intelligently based on their deadline, details, and importance flag.
    Today's date is ${todayStr}.
    
    Tasks to prioritize:
    ${JSON.stringify(tasks, null, 2)}
    
    Rank all tasks from highest to lowest priority. For each task, provide a concise, supportive "reasoning" (maximum 2 sentences) explaining why it was placed at this rank, relative to deadlines and importance.`;

    const response = await generateWithFallback({
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["prioritized"],
          properties: {
            prioritized: {
              type: Type.ARRAY,
              description: "Array of tasks in rank order from highest to lowest priority",
              items: {
                type: Type.OBJECT,
                required: ["taskName", "reasoning"],
                properties: {
                  taskName: {
                    type: Type.STRING,
                    description: "The exact name of the task, matching the input list."
                  },
                  reasoning: {
                    type: Type.STRING,
                    description: "Short description of why this is prioritized, e.g. 'Due tomorrow and marked as important.'"
                  }
                }
              }
            }
          }
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response from Gemini API");
    }

    const result = JSON.parse(text);
    res.json(result);
  } catch (error: any) {
    console.error("Error in /api/prioritize, running smart local fallback:", error);
    try {
      const sorted = [...tasks].sort((a: any, b: any) => {
        if (a.imp && !b.imp) return -1;
        if (!a.imp && b.imp) return 1;
        const dateA = a.deadline ? new Date(a.deadline).getTime() : Infinity;
        const dateB = b.deadline ? new Date(b.deadline).getTime() : Infinity;
        return dateA - dateB;
      });

      const prioritized = sorted.map((task: any) => {
        let reason = "Recommended sequence based on chronological deadline.";
        if (task.imp) {
          reason = "Ranked highly because it is marked as important and requires early action.";
        } else if (task.deadline) {
          reason = `Ranked chronologically before deadline of ${task.deadline}.`;
        }
        return {
          taskName: task.task,
          reasoning: reason
        };
      });

      res.json({ prioritized });
    } catch (fallbackError) {
      res.status(500).json({ error: "Failed to prioritize tasks locally" });
    }
  }
});

// 5B: AI Daily Schedule Generator Endpoint
app.post("/api/generate-day", async (req, res) => {
  let brief: string = "";
  let hours: any[] = [];
  try {
    brief = req.body.brief;
    hours = req.body.hours;
    if (!brief) {
      return res.status(400).json({ error: "Brief of your day is required" });
    }

    const prompt = `You are an AI Schedule Expert. A user has typed this brief about their day:
    "${brief}"
    
    We need to fill in schedule blocks for the day. Here are the hourly slots available:
    ${JSON.stringify(hours)}
    
    Intelligently schedule study blocks, work sessions, meal times, breaks, gym, and sleep, fitting around any fixed commitments they mentioned in their brief. Be realistic—don't schedule 8 hours of study without breaks, and ensure time for meals.
    
    Provide an activity title and short description for each hourly slot. If a slot should be left completely empty, set its title to "".`;

    const response = await generateWithFallback({
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["schedule"],
          properties: {
            schedule: {
              type: Type.ARRAY,
              description: "Full schedule mapping to each hour slot provided in order",
              items: {
                type: Type.OBJECT,
                required: ["hourSlot", "title", "description"],
                properties: {
                  hourSlot: {
                    type: Type.STRING,
                    description: "The time slot label, e.g. '9:00 - 10:00'"
                  },
                  title: {
                    type: Type.STRING,
                    description: "Short title of the planned activity. Empty string if nothing is scheduled."
                  },
                  description: {
                    type: Type.STRING,
                    description: "Helpful tip or instruction for this slot."
                  }
                }
              }
            }
          }
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response from Gemini API");
    }

    const result = JSON.parse(text);
    res.json(result);
  } catch (error: any) {
    console.error("Error in /api/generate-day, running smart local fallback:", error);
    try {
      const briefLower = (brief || "").toLowerCase();
      const schedule = (hours || []).map((slot: any, idx: number) => {
        const hourSlot = slot.hourSlot || `${idx + 6}:00 - ${idx + 7}:00`;
        let title = "";
        let description = "";
        
        if (idx === 0) {
          title = "Morning Routine";
          description = "Start the day fresh, hydrate, and prepare for the agenda.";
        } else if (idx === 1) {
          title = "Healthy Breakfast";
          description = "Re-energize with a nutritious breakfast block.";
        } else if (idx === 6) {
          title = "Lunch Break";
          description = "Unplug, relax, and refuel.";
        } else if (idx === 13) {
          title = "Dinner & Wind-down";
          description = "Enjoy dinner and reflect on today's progress.";
        } else if (idx === 17) {
          title = "Rest & Sleep Prep";
          description = "Unwind completely, turn off devices, and get ready for deep rest.";
        } else {
          if (briefLower.includes("exam") || briefLower.includes("study") || briefLower.includes("learn") || briefLower.includes("test")) {
            title = idx < 8 ? "Active Study Interval" : "Revision & Practice Problems";
            description = "Deep dive into your study topics using high-focus pomodoro sessions.";
          } else if (briefLower.includes("project") || briefLower.includes("code") || briefLower.includes("work") || briefLower.includes("develop")) {
            title = idx < 8 ? "Deep Work Focus Block" : "Task Execution & Refactoring";
            description = "Minimize distractions, focus on coding or building features sequentially.";
          } else if (briefLower.includes("gym") || briefLower.includes("run") || briefLower.includes("workout") || briefLower.includes("exercise")) {
            if (idx === 11 || idx === 12) {
              title = "Fitness & Exercise";
              description = "Get moving, boost circulation, and complete your scheduled workout.";
            } else {
              title = "Productive Action";
              description = "Execute remaining action items on your lists.";
            }
          } else {
            title = idx < 8 ? "High Focus Work Session" : "Strategic Review & Planning";
            description = "Accomplish key daily task list items with single-minded focus.";
          }
        }
        return { hourSlot, title, description };
      });
      res.json({ schedule });
    } catch (fallbackError) {
      res.status(500).json({ error: "Failed to generate schedule locally" });
    }
  }
});

// 5C: AI Goal Suggestions Endpoint
app.post("/api/suggest-goals", async (req, res) => {
  let focus: string = "";
  let deadlines: string = "";
  try {
    focus = req.body.focus;
    deadlines = req.body.deadlines;
    if (!focus || !deadlines) {
      return res.status(400).json({ error: "Focus and Deadlines questions must be answered" });
    }

    const prompt = `You are an AI Goal Architect. Recommend 3 to 5 highly actionable, smart daily goals for today.
    The user's inputs are:
    1. Today's focus: "${focus}"
    2. Upcoming deadlines / commitments: "${deadlines}"
    
    Formulate highly specific goals that can be measured and completed today. Ensure categories are one of: 'Study', 'Work', 'Health', or 'Personal'.`;

    const response = await generateWithFallback({
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["goals"],
          properties: {
            goals: {
              type: Type.ARRAY,
              description: "3 to 5 smart goal recommendations",
              items: {
                type: Type.OBJECT,
                required: ["name", "category", "target", "unit"],
                properties: {
                  name: {
                    type: Type.STRING,
                    description: "The descriptive title of the goal, e.g. 'Solve 5 calculus derivatives' or 'Drink 3 liters of water'"
                  },
                  category: {
                    type: Type.STRING,
                    description: "Must be exactly one of: 'Study', 'Work', 'Health', 'Personal'"
                  },
                  target: {
                    type: Type.INTEGER,
                    description: "Numerical target target count to achieve today, e.g. 5, 30, 3"
                  },
                  unit: {
                    type: Type.STRING,
                    description: "Measurement unit, e.g. 'problems', 'minutes', 'liters', 'pages'"
                  }
                }
              }
            }
          }
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response from Gemini API");
    }

    const result = JSON.parse(text);
    res.json(result);
  } catch (error: any) {
    console.error("Error in /api/suggest-goals, running smart local fallback:", error);
    try {
      const focusLower = (focus || "").toLowerCase();
      let goals = [];
      if (focusLower.includes("study") || focusLower.includes("learn") || focusLower.includes("exam") || focusLower.includes("read")) {
        goals = [
          { name: "Revise 3 core subject modules", category: "Study", target: 3, unit: "modules" },
          { name: "Solve 5 practice question papers", category: "Study", target: 5, unit: "papers" },
          { name: "Take a 10-minute active recall break every hour", category: "Health", target: 4, unit: "breaks" },
          { name: "Organize notes for tomorrow's revision", category: "Personal", target: 1, unit: "session" }
        ];
      } else if (focusLower.includes("work") || focusLower.includes("project") || focusLower.includes("code") || focusLower.includes("job")) {
        goals = [
          { name: "Complete 4 high-priority Jira issues / items", category: "Work", target: 4, unit: "tasks" },
          { name: "Write clean documentation for active APIs", category: "Work", target: 1, unit: "document" },
          { name: "Drink 3 liters of water during work blocks", category: "Health", target: 3, unit: "liters" },
          { name: "Empty pending workspace inbox emails", category: "Personal", target: 15, unit: "emails" }
        ];
      } else {
        goals = [
          { name: "Complete 3 essential task list items", category: "Work", target: 3, unit: "tasks" },
          { name: "Dedicated 45-minute focus intervals", category: "Study", target: 3, unit: "intervals" },
          { name: "Hydrate and take brief stretch breaks", category: "Health", target: 5, unit: "breaks" },
          { name: "Perform a 10-minute nightly review and prep", category: "Personal", target: 10, unit: "minutes" }
        ];
      }
      res.json({ goals });
    } catch (fallbackError) {
      res.status(500).json({ error: "Failed to suggest goals locally" });
    }
  }
});

// 5D: AI Productivity Coach Chat Endpoint (Interactive)
app.post("/api/productivity-coach", async (req, res) => {
  let message: string = "";
  let history: any[] = [];
  try {
    message = req.body.message;
    history = req.body.history;
    if (!message) {
      return res.status(400).json({ error: "Message is required" });
    }

    // Format history for GoogleGenAI SDK chat or generateContent
    // We can use generateContent with conversational system instruction, or create a chat session.
    // Let's pass the context directly for ease of custom structured JSON response.
    const prompt = `You are "Chrono-Coach", a high-performance personal productivity mentor who is direct, empathetic, and exceptionally good at helping last-minute procrastinators turn panic into organized plans.
    
    The user says: "${message}"
    
    Chat History:
    ${JSON.stringify(history || [])}
    
    Your task:
    1. Provide a highly encouraging, actionable, and structured response in markdown.
    2. If the user is asking to plan something, draft some actionable TODO tasks and planner hourly slots that fit their request.
    3. Return your response in JSON format containing:
       - "reply": your conversational coaching reply (in markdown)
       - "suggestedTasks": an optional array of todo task objects: { name: string, details: string, imp: boolean }
       - "suggestedPlannerBlocks": an optional array of schedule blocks: { hourSlotIndex: number, title: string }
       
       Available schedule hour indices correspond to these times:
       0: 6:00-7:00
       1: 7:00-8:00
       2: 8:00-9:00
       3: 9:00-10:00
       4: 10:00-11:00
       5: 11:00-12:00
       6: 12:00-13:00
       7: 13:00-14:00
       8: 14:00-15:00
       9: 15:00-16:00
       10: 16:00-17:00
       11: 17:00-18:00
       12: 18:00-19:00
       13: 19:00-20:00
       14: 20:00-21:00
       15: 21:00-22:00
       16: 22:00-23:00
       17: 23:00-24:00
       
    Make sure "suggestedTasks" and "suggestedPlannerBlocks" are only populated if they are directly relevant to planning or solving their request. Otherwise, leave them as empty arrays.`;

    const response = await generateWithFallback({
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["reply"],
          properties: {
            reply: {
              type: Type.STRING,
              description: "Conversational response from the coach, rich formatted in markdown"
            },
            suggestedTasks: {
              type: Type.ARRAY,
              description: "Optional tasks that the user can automatically add to their To-Do list",
              items: {
                type: Type.OBJECT,
                required: ["name", "details", "imp"],
                properties: {
                  name: { type: Type.STRING },
                  details: { type: Type.STRING },
                  imp: { type: Type.BOOLEAN }
                }
              }
            },
            suggestedPlannerBlocks: {
              type: Type.ARRAY,
              description: "Optional planner blocks that the user can automatically populate",
              items: {
                type: Type.OBJECT,
                required: ["hourSlotIndex", "title"],
                properties: {
                  hourSlotIndex: { 
                    type: Type.INTEGER, 
                    description: "The index from 0 to 17 representing the hourly slot" 
                  },
                  title: { type: Type.STRING, description: "Action/subject title" }
                }
              }
            }
          }
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response from Gemini API");
    }

    const result = JSON.parse(text);
    res.json(result);
  } catch (error: any) {
    console.error("Error in /api/productivity-coach, running smart local fallback:", error);
    try {
      const msgLower = (message || "").toLowerCase();
      let reply = "";
      let suggestedTasks: any[] = [];
      let suggestedPlannerBlocks: any[] = [];
      
      if (msgLower.includes("lazy") || msgLower.includes("procrastinate") || msgLower.includes("stuck") || msgLower.includes("tired")) {
        reply = `### ⏰ Chrono-Coach Procrastination Breakthrough\n\nI hear you. Feeling stuck, lazy, or tired is just your brain trying to protect you from overwhelming tasks. Let's break the cycle **right now**:\n\n1. **The 5-Minute Rule**: Pick your absolute smallest task. Work on it for *just 5 minutes*. If you want to stop after 5 minutes, you have permission to stop. Usually, you will keep going!\n2. **Clean Slate**: Clear your desk, close all browser tabs except the one you need, and put your phone in another room.\n3. **Momentum**: Action breeds motivation, not the other way around. Get one micro-win now!`;
        suggestedTasks = [
          { name: "5-Minute Micro-Win Focus Block", details: "Work on any single pending task with a timer for 5 minutes straight.", imp: true }
        ];
        suggestedPlannerBlocks = [
          { hourSlotIndex: 3, title: "5-Minute Procrastination Buster" }
        ];
      } else if (msgLower.includes("plan") || msgLower.includes("schedule") || msgLower.includes("calendar")) {
        reply = `### 📅 Smart Planning Blueprint\n\nOrganizing your day is the best way to reduce anxiety. Here is how we will structure this:\n\n- **Timeboxing**: Assign a specific hour block for your highest-priority items.\n- **Protect Your Focus**: Avoid checking social media or emails until your deep-work block is completed.\n- **Buffer Times**: Leave a 15-minute gap between major tasks to prevent schedule overflow.`;
        suggestedTasks = [
          { name: "Configure Daily Priority Blocks", details: "Timebox your main tasks on your calendar with clear boundaries.", imp: false }
        ];
      } else {
        reply = `### 🚀 Chrono-Coach Power Session\n\nLet's get strategic! You've got deadlines to crush. Here is your game plan:\n\n1. **Identify the Frog**: What is the *one* task you are dreading the most? Do that first. Once it's done, everything else will feel like downhill skiing.\n2. **Single-Tasking**: Multi-tasking is a myth that wastes 40% of your cognitive capacity. Focus on one single checklist item until it is 100% complete.\n3. **Refuel**: Work in 50-minute blocks followed by 10-minute screen-free breaks.`;
        suggestedTasks = [
          { name: "Do the hardest task first", details: "Tackle your most dreaded task for 25 continuous minutes.", imp: true }
        ];
      }
      
      res.json({
        reply,
        suggestedTasks,
        suggestedPlannerBlocks
      });
    } catch (fallbackError) {
      res.status(500).json({ error: "Failed to chat with coach locally" });
    }
  }
});

// 6C: Smart time suggestion for adding a task to Calendar
app.post("/api/suggest-task-time", async (req, res) => {
  try {
    const { taskName, details, deadline, currentHour, isImportant } = req.body;

    const prompt = `A user wants to schedule this task in their calendar:
    Task: "${taskName}"
    Details: "${details || 'none'}"
    Deadline: "${deadline || 'today'}"
    Current hour (24hr): ${currentHour}
    Marked important: ${isImportant}

    Suggest the best start and end time to schedule this task today. Consider:
    - Start after the current hour
    - Duration: 30–90 minutes depending on complexity
    - Important tasks should be scheduled sooner
    - Avoid very late hours unless necessary

    Reply with JSON only: { "startTime": "HH:MM", "endTime": "HH:MM", "reason": "one short sentence" }`;

    const response = await generateWithFallback({
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["startTime", "endTime", "reason"],
          properties: {
            startTime: { type: Type.STRING, description: "Start time in HH:MM 24hr format" },
            endTime: { type: Type.STRING, description: "End time in HH:MM 24hr format" },
            reason: { type: Type.STRING, description: "One sentence explaining why this time was chosen" }
          }
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response from Gemini API");
    }

    const result = JSON.parse(text);
    res.json(result);
  } catch (error: any) {
    console.error("Error in /api/suggest-task-time:", error);
    // Fallback: next hour + 1 hour duration
    const next = (new Date().getHours() + 1) % 24;
    res.json({
      startTime: `${String(next).padStart(2, '0')}:00`,
      endTime: `${String((next + 1) % 24).padStart(2, '0')}:00`,
      reason: "Scheduled at the next available hour."
    });
  }
});

// Endpoint to serve dynamic config to the client-side app at runtime
app.get("/api/config", (req, res) => {
  res.json({
    googleClientId: process.env.VITE_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || ""
  });
});

// Serve static assets or mount Vite dev server
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
