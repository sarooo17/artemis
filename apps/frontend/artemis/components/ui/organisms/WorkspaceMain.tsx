"use client";

import { useState } from "react";
import Text from "../atoms/Text";
import CommandInput from "../molecules/CommandInput";
import TaskList from "./TaskList";
import { TaskItemProps } from "../molecules/TaskItem";

export interface WorkspaceMainProps {
  title?: string;
  subtitle?: string;
  placeholder?: string;
  todayTasks?: (TaskItemProps & { id: string })[];
  recentItems?: (TaskItemProps & { id: string })[];
  onCommandSubmit?: (command: string) => void;
}

const WorkspaceMain = ({
  title = "What are you working on?",
  subtitle,
  placeholder = "Ask for sales review",
  todayTasks = [],
  recentItems = [],
  onCommandSubmit,
}: WorkspaceMainProps) => {
  const [commandValue, setCommandValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!commandValue.trim()) return;

    setIsLoading(true);
    try {
      if (onCommandSubmit) {
        await onCommandSubmit(commandValue);
      }
      setCommandValue("");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-8 max-w-4xl mx-auto">
      <div className="w-full max-w-2xl space-y-8">
        {/* Header */}
        <div className="text-center mb-12">
          <Text variant="h1" weight="light" className="mb-2">
            {title}
          </Text>
          {subtitle && (
            <Text variant="body" color="muted">
              {subtitle}
            </Text>
          )}
        </div>

        {/* Command Input */}
        <CommandInput
          value={commandValue}
          onChange={setCommandValue}
          onSubmit={handleSubmit}
          placeholder={placeholder}
          isLoading={isLoading}
        />

        {/* Today Tasks */}
        {todayTasks.length > 0 && (
          <div className="mt-12">
            <TaskList title="Today you might want to..." tasks={todayTasks} />
          </div>
        )}

        {/* Recent Items */}
        {recentItems.length > 0 && (
          <div className="mt-12">
            <TaskList title="Recent" tasks={recentItems} />
          </div>
        )}
      </div>
    </main>
  );
};

export default WorkspaceMain;
