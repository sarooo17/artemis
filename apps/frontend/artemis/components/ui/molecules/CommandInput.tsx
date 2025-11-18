import Button from "../atoms/Button";
import Input from "../atoms/Input";
import Icon from "../atoms/Icon";

export interface CommandInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  isLoading?: boolean;
}

const CommandInput = ({
  value,
  onChange,
  onSubmit,
  placeholder = "Type a command...",
  isLoading = false,
}: CommandInputProps) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="flex items-center gap-3 bg-white rounded-2xl shadow-sm border border-gray-200 px-4 py-3 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all">
      <button className="text-gray-400 hover:text-gray-600 text-xl transition-colors">
        +
      </button>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={isLoading}
        className="flex-1 outline-none text-gray-700 placeholder-gray-400 disabled:opacity-50"
      />
      <Button
        size="sm"
        onClick={onSubmit}
        isLoading={isLoading}
        disabled={!value.trim() || isLoading}
        className="rounded-full! px-3! py-2!"
      >
        {!isLoading && <Icon icon="🎵" size="sm" />}
      </Button>
    </div>
  );
};

export default CommandInput;
