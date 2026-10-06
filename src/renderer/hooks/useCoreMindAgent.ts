import { useEffect, useRef, useState, useCallback } from 'react';
import { CoreMindEvent, TaskNode } from '../types/coremind';

export function useCoreMindAgent(wsUrl: string = 'ws://localhost:43110/ws') {
  const socketRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<CoreMindEvent | null>(null);
  const [tasks, setTasks] = useState<TaskNode[]>([]);
  const [pendingQuestion, setPendingQuestion] = useState<{ id: string; text: string; options: string[] } | null>(null);
  const [pendingApproval, setPendingApproval] = useState<{ id: string; tool: string; description: string } | null>(null);
  const [latestDiff, setLatestDiff] = useState<any>(null);

  useEffect(() => {
    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => setIsConnected(true);
    ws.onclose = () => setIsConnected(false);

    ws.onmessage = (event) => {
      try {
        const parsed: CoreMindEvent = JSON.parse(event.data);
        setCurrentEvent(parsed);

        switch (parsed.type) {
          case 'plan.created':
            if (parsed.data?.nodes) setTasks(parsed.data.nodes);
            break;
          case 'task.started':
          case 'task.completed':
            setTasks((prev) =>
              prev.map((t) =>
                t.id === parsed.data.task_id
                  ? { ...t, status: parsed.type === 'task.started' ? 'in_progress' : 'completed' }
                  : t
              )
            );
            break;
          case 'agent.waiting_for_user':
            setPendingQuestion({
              id: parsed.data.question_id,
              text: parsed.data.question,
              options: parsed.data.options || [],
            });
            break;
          case 'agent.approval.required':
            setPendingApproval({
              id: parsed.data.approval_id,
              tool: parsed.data.tool,
              description: parsed.data.description,
            });
            break;
          case 'diff.created':
            setLatestDiff(parsed.data);
            break;
        }
      } catch (err) {
        console.error('Failed to parse WS event:', err);
      }
    };

    return () => {
      ws.close();
    };
  }, [wsUrl]);

  const send = useCallback((message: object) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
    }
  }, []);

  const answerQuestion = useCallback(
    (questionId: string, answer: string) => {
      send({ type: 'agent.question_answer', question_id: questionId, answer });
      setPendingQuestion(null);
    },
    [send]
  );

  const approve = useCallback(
    (approvalId: string) => {
      send({ type: 'agent.approve', approval_id: approvalId });
      setPendingApproval(null);
    },
    [send]
  );

  const deny = useCallback(
    (approvalId: string, reason?: string) => {
      send({ type: 'agent.deny', approval_id: approvalId, reason });
      setPendingApproval(null);
    },
    [send]
  );

  return {
    isConnected,
    currentEvent,
    tasks,
    pendingQuestion,
    pendingApproval,
    latestDiff,
    answerQuestion,
    approve,
    deny,
  };
}
