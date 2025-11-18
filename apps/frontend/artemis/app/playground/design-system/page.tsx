"use client";

import { useState } from "react";
import NavigationSidebar from "@/components/ui/organisms/NavigationSidebar";
import {
  Button,
  Input,
  Textarea,
  Badge,
  Card,
  Avatar,
  Text,
  Icon,
  Spinner,
} from "@/components/ui/atoms";
import {
  SearchInput,
  StatCard,
  TaskItem,
  UserCard,
  CommandInput,
} from "@/components/ui/molecules";
import { StatsGrid, TaskList } from "@/components/ui/organisms";

export default function DesignSystemPage() {
  const [inputValue, setInputValue] = useState("");
  const [commandValue, setCommandValue] = useState("");

  const navItems = [
    { id: "atoms", icon: "🔷", label: "Atoms" },
    { id: "molecules", icon: "🔶", label: "Molecules" },
    { id: "organisms", icon: "🔴", label: "Organisms" },
  ];

  const stats = [
    {
      id: "1",
      title: "Total Revenue",
      value: "€847,320",
      icon: "💰",
      trend: { value: 12.5, isPositive: true },
    },
    {
      id: "2",
      title: "New Orders",
      value: "1,284",
      icon: "📦",
      trend: { value: 8.3, isPositive: true },
    },
    {
      id: "3",
      title: "Avg Order Value",
      value: "€659",
      icon: "📊",
      trend: { value: 2.1, isPositive: false },
    },
  ];

  const tasks = [
    {
      id: "1",
      icon: "📄",
      title: "Invoice Draft - Rossi SRL",
      description: "Edited 17 min ago",
      badge: "Urgent",
    },
    {
      id: "2",
      icon: "📊",
      title: "Margin Report - Q2",
      description: "Viewed 3 days ago",
    },
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      <NavigationSidebar
        items={navItems}
        logoIcon="A"
        userName="Riccardo Saro"
        userStatus="online"
      />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-8 py-12 space-y-16">
          {/* Header */}
          <div>
            <Text variant="display" weight="bold" className="mb-2">
              Artemis Design System
            </Text>
            <Text variant="body" color="muted">
              Atomic Design Pattern - Atoms, Molecules, Organisms
            </Text>
          </div>

          {/* Atoms Section */}
          <section id="atoms" className="space-y-8">
            <div>
              <Text variant="h2" weight="bold" className="mb-2">
                🔷 Atoms
              </Text>
              <Text color="muted">Basic building blocks</Text>
            </div>

            {/* Buttons */}
            <Card>
              <Text variant="h4" weight="semibold" className="mb-4">
                Buttons
              </Text>
              <div className="flex flex-wrap gap-3">
                <Button variant="primary">Primary</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="danger">Danger</Button>
                <Button variant="outline">Outline</Button>
                <Button size="sm">Small</Button>
                <Button size="lg">Large</Button>
                <Button isLoading>Loading</Button>
                <Button leftIcon={<Icon icon="✓" size="sm" />}>
                  With Icon
                </Button>
              </div>
            </Card>

            {/* Inputs */}
            <Card>
              <Text variant="h4" weight="semibold" className="mb-4">
                Inputs
              </Text>
              <div className="space-y-4 max-w-md">
                <Input
                  label="Email"
                  type="email"
                  placeholder="email@example.com"
                />
                <Input
                  label="Password"
                  type="password"
                  placeholder="••••••••"
                  helperText="Minimum 8 characters"
                />
                <Input
                  label="With Error"
                  error="This field is required"
                  placeholder="Error state"
                />
                <Input
                  placeholder="With icons"
                  leftIcon={<Icon icon="🔍" size="sm" />}
                  rightIcon={<Icon icon="✓" size="sm" />}
                />
                <Textarea
                  label="Description"
                  rows={3}
                  placeholder="Enter description..."
                />
              </div>
            </Card>

            {/* Badges & Avatars */}
            <Card>
              <Text variant="h4" weight="semibold" className="mb-4">
                Badges & Avatars
              </Text>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge>Default</Badge>
                  <Badge variant="primary">Primary</Badge>
                  <Badge variant="success">Success</Badge>
                  <Badge variant="warning">Warning</Badge>
                  <Badge variant="danger">Danger</Badge>
                  <Badge variant="outline">Outline</Badge>
                  <Badge rounded>Rounded</Badge>
                </div>
                <div className="flex gap-3 items-center">
                  <Avatar fallback="RS" size="xs" />
                  <Avatar fallback="RS" size="sm" />
                  <Avatar fallback="RS" size="md" status="online" />
                  <Avatar fallback="RS" size="lg" status="busy" />
                  <Avatar fallback="RS" size="xl" status="away" />
                </div>
              </div>
            </Card>

            {/* Typography */}
            <Card>
              <Text variant="h4" weight="semibold" className="mb-4">
                Typography
              </Text>
              <div className="space-y-2">
                <Text variant="display">Display Text</Text>
                <Text variant="h1">Heading 1</Text>
                <Text variant="h2">Heading 2</Text>
                <Text variant="h3">Heading 3</Text>
                <Text variant="h4">Heading 4</Text>
                <Text variant="body">Body text - regular paragraph</Text>
                <Text variant="small">Small text</Text>
                <Text variant="caption">Caption text</Text>
              </div>
            </Card>

            {/* Cards & Spinners */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card variant="default">
                <Text weight="semibold" className="mb-2">
                  Default Card
                </Text>
                <Text color="muted">With border</Text>
              </Card>
              <Card variant="outlined">
                <Text weight="semibold" className="mb-2">
                  Outlined Card
                </Text>
                <Text color="muted">With thick border</Text>
              </Card>
              <Card variant="elevated" hoverable>
                <Text weight="semibold" className="mb-2">
                  Elevated Card
                </Text>
                <Text color="muted">With shadow & hover</Text>
              </Card>
              <Card className="flex items-center justify-center gap-4">
                <Spinner size="xs" />
                <Spinner size="sm" />
                <Spinner size="md" />
                <Spinner size="lg" />
              </Card>
            </div>
          </section>

          {/* Molecules Section */}
          <section id="molecules" className="space-y-8">
            <div>
              <Text variant="h2" weight="bold" className="mb-2">
                🔶 Molecules
              </Text>
              <Text color="muted">Simple combinations of atoms</Text>
            </div>

            {/* Inputs */}
            <Card>
              <Text variant="h4" weight="semibold" className="mb-4">
                Input Molecules
              </Text>
              <div className="space-y-4 max-w-md">
                <SearchInput placeholder="Search anything..." />
                <CommandInput
                  value={commandValue}
                  onChange={setCommandValue}
                  onSubmit={() => console.log(commandValue)}
                  placeholder="Type a command..."
                />
              </div>
            </Card>

            {/* Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <StatCard
                title="Total Revenue"
                value="€847,320"
                icon="💰"
                trend={{ value: 12.5, isPositive: true }}
              />
              <StatCard
                title="New Orders"
                value="1,284"
                icon="📦"
                trend={{ value: 2.1, isPositive: false }}
              />
            </div>

            {/* User & Task Cards */}
            <Card>
              <Text variant="h4" weight="semibold" className="mb-4">
                User & Task Cards
              </Text>
              <div className="space-y-3">
                <UserCard
                  name="Riccardo Saro"
                  email="riccardo@artemis.com"
                  role="Admin"
                  status="online"
                />
                <TaskItem
                  icon="📄"
                  title="Invoice Draft - Rossi SRL"
                  description="Edited 17 min ago"
                  badge="Urgent"
                  timestamp="2 hours ago"
                  onToggle={() => {}}
                  onAction={() => {}}
                />
                <TaskItem
                  icon="📊"
                  title="Margin Report - Q2"
                  description="Viewed 3 days ago"
                  completed
                  onToggle={() => {}}
                />
              </div>
            </Card>
          </section>

          {/* Organisms Section */}
          <section id="organisms" className="space-y-8">
            <div>
              <Text variant="h2" weight="bold" className="mb-2">
                🔴 Organisms
              </Text>
              <Text color="muted">Complex UI structures</Text>
            </div>

            {/* Stats Grid */}
            <Card>
              <Text variant="h4" weight="semibold" className="mb-4">
                Stats Grid
              </Text>
              <StatsGrid stats={stats} columns={3} />
            </Card>

            {/* Task List */}
            <Card>
              <TaskList
                title="Recent Tasks"
                tasks={tasks}
                emptyMessage="No tasks available"
              />
            </Card>
          </section>
        </div>
      </main>
    </div>
  );
}
