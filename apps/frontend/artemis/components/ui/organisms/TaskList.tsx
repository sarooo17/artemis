import Text from "../atoms/Text";
import TaskItem, { TaskItemProps } from "../molecules/TaskItem";

export interface TaskListProps {
  title?: string;
  tasks: (TaskItemProps & { id: string })[];
  emptyMessage?: string;
}

const TaskList = ({
  title,
  tasks,
  emptyMessage = "No tasks available",
}: TaskListProps) => {
  return (
    <div className="space-y-4">
      {title && (
        <Text variant="caption" color="muted">
          {title}
        </Text>
      )}
      <div className="space-y-1">
        {tasks.length === 0 ? (
          <div className="py-8 text-center">
            <Text color="muted">{emptyMessage}</Text>
          </div>
        ) : (
          tasks.map((task) => <TaskItem key={task.id} {...task} />)
        )}
      </div>
    </div>
  );
};

export default TaskList;
