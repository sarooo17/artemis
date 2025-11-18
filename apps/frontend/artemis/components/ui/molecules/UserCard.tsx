import Card, { CardProps } from "../atoms/Card";
import Avatar from "../atoms/Avatar";
import Text from "../atoms/Text";
import Badge from "../atoms/Badge";

export interface UserCardProps extends Omit<CardProps, "children"> {
  name: string;
  email?: string;
  avatar?: string;
  role?: string;
  status?: "online" | "offline" | "busy" | "away";
  onClick?: () => void;
}

const UserCard = ({
  name,
  email,
  avatar,
  role,
  status,
  onClick,
  ...cardProps
}: UserCardProps) => {
  return (
    <Card
      {...cardProps}
      hoverable={!!onClick}
      onClick={onClick}
      className="flex items-center gap-3"
    >
      <Avatar src={avatar} alt={name} fallback={name} status={status} />
      <div className="flex-1 min-w-0">
        <Text weight="medium" truncate>
          {name}
        </Text>
        {email && (
          <Text variant="small" color="muted" truncate>
            {email}
          </Text>
        )}
      </div>
      {role && <Badge variant="outline">{role}</Badge>}
    </Card>
  );
};

export default UserCard;
