import { useEffect, useRef } from 'react';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Task } from '../types';

interface UseTaskRemindersProps {
  userId: string;
  onNotify: (title: string, body: string) => void;
}

export function useTaskReminders({ userId, onNotify }: UseTaskRemindersProps) {
  const notifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!userId) return;

    // Real-time Firestore sync listener
    const q = query(collection(db, 'users', userId, 'tasks'));
    const unsub = onSnapshot(q, (snap) => {
      const tasks = snap.docs.map(d => ({ id: d.id, ...d.data() } as Task));
      checkDueTasks(tasks);
    }, (err) => {
      console.error('Failed to query tasks for reminders:', err);
    });

    // Run local timer check every 60 seconds to support live countdown updates
    const interval = setInterval(() => {
      // Re-evaluate current list of tasks periodically for time-based triggers
      const unsubCheck = onSnapshot(query(collection(db, 'users', userId, 'tasks')), (snap) => {
        const tasks = snap.docs.map(d => ({ id: d.id, ...d.data() } as Task));
        checkDueTasks(tasks);
        unsubCheck(); // One-shot evaluation
      });
    }, 60000);

    function checkDueTasks(tasks: Task[]) {
      const now = new Date();
      tasks.forEach(task => {
        if (task.completed || !task.deadline || notifiedRef.current.has(task.id)) {
          return;
        }

        const deadline = new Date(task.deadline);
        const diffMinutes = (deadline.getTime() - now.getTime()) / 60000;

        // Notify when a task is due within 15 minutes or overdue by less than 5 minutes
        if (diffMinutes <= 15 && diffMinutes > -5) {
          if (diffMinutes > 0) {
            onNotify(
              `⏰ Task Due Soon: "${task.task}"`,
              `Due in ${Math.round(diffMinutes)} minutes. Details: ${task.details || 'No description provided.'}`
            );
          } else {
            onNotify(
              `⚠️ Task Overdue: "${task.task}"`,
              `Was due ${Math.abs(Math.round(diffMinutes))} minutes ago!`
            );
          }
          notifiedRef.current.add(task.id);
        }
      });
    }

    return () => {
      clearInterval(interval);
      unsub();
    };
  }, [userId, onNotify]);
}
