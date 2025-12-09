import { useEffect, useState, useCallback, useRef } from 'react';

export function useNotificationCount(userId: string) {
  const [count, setCount] = useState(0);
  const lastFetch = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchNotifications = useCallback(() => {
    if (!userId) return;
    
    const now = Date.now();
    // Avoid excessive calls - minimum 10 seconds between fetches
    if (now - lastFetch.current < 10000) return;
    
    lastFetch.current = now;
    fetch(`/api/notifications?userId=${encodeURIComponent(userId)}`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) setCount(data.length);
        else if (data.notifications) setCount(data.notifications.length);
        else setCount(0);
      })
      .catch(() => setCount(0));
  }, [userId]);

  const startPolling = useCallback(() => {
    if (intervalRef.current) return; // Already polling
    
    // Only poll if page is visible
    if (document.visibilityState === 'visible') {
      intervalRef.current = setInterval(() => {
        if (document.visibilityState === 'visible') {
          fetchNotifications();
        }
      }, 60000); // Increased to 60 seconds
    }
  }, [fetchNotifications]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!userId) return;

    // Initial fetch
    fetchNotifications();

    // Start polling
    startPolling();

    // Handle page visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchNotifications(); // Immediate refresh when page becomes visible
        startPolling();
      } else {
        stopPolling();
      }
    };

    // Handle window focus for immediate refresh
    const handleFocus = () => {
      fetchNotifications();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [userId, fetchNotifications, startPolling, stopPolling]);

  return count;
}
