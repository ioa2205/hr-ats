"use client";

import { notFound } from "next/navigation";
import { useState } from "react";
import { Inbox, Search, Bell, Plus, Trash2, Star } from "lucide-react";
import {
  Button,
  Input,
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  ToastProvider,
  useToast,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  Skeleton,
  Spinner,
  EmptyState,
} from "@/components/ui";

if (process.env.NODE_ENV !== "development") {
  notFound();
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4">
      <h2 className="border-outline-variant text-on-surface border-b pb-2 text-xl font-semibold">
        {title}
      </h2>
      {children}
    </section>
  );
}

function ToastDemo() {
  const { toast } = useToast();
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="tonal"
        size="sm"
        onClick={() =>
          toast({ variant: "success", title: "Saved", description: "Changes saved successfully." })
        }
      >
        Success Toast
      </Button>
      <Button
        variant="tonal"
        size="sm"
        onClick={() =>
          toast({ variant: "error", title: "Error", description: "Something went wrong." })
        }
      >
        Error Toast
      </Button>
      <Button
        variant="tonal"
        size="sm"
        onClick={() =>
          toast({ variant: "info", title: "Info", description: "Here is some information." })
        }
      >
        Info Toast
      </Button>
    </div>
  );
}

function DevContent() {
  const [inputVal, setInputVal] = useState("");

  return (
    <div className="mx-auto max-w-4xl space-y-12 px-6 py-10">
      <h1 className="text-primary text-3xl font-bold">Design System — Dev</h1>

      {/* Buttons */}
      <Section title="Button">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="tonal">Tonal</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
            <Button variant="link">Link</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button loading>Loading</Button>
            <Button disabled>Disabled</Button>
          </div>
        </div>
      </Section>

      {/* Input */}
      <Section title="Input">
        <div className="max-w-sm space-y-4">
          <Input label="Name" placeholder="Enter your name" />
          <Input
            label="Email"
            placeholder="user@example.com"
            startAdornment={<Search className="h-4 w-4" />}
          />
          <Input
            label="Bio"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            helperText="Tell us about yourself"
            maxCharacters={100}
            currentLength={inputVal.length}
          />
          <Input label="Error field" error="This field is required" defaultValue="" />
        </div>
      </Section>

      {/* Badge */}
      <Section title="Badge">
        <div className="flex flex-wrap gap-3">
          <Badge tone="success">Active</Badge>
          <Badge tone="warning">Pending</Badge>
          <Badge tone="danger">Rejected</Badge>
          <Badge tone="info">New</Badge>
          <Badge tone="neutral">Draft</Badge>
        </div>
        <div className="flex flex-wrap gap-3">
          <Badge tone="success" variant="dot">
            Dot
          </Badge>
          <Badge tone="warning" variant="pulse">
            Pulse
          </Badge>
          <Badge tone="info" size="md">
            Medium
          </Badge>
        </div>
      </Section>

      {/* Card */}
      <Section title="Card">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Basic Card</CardTitle>
              <CardDescription>A simple card with content.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-on-surface-variant text-sm">Card body text goes here.</p>
            </CardContent>
            <CardFooter>
              <Button size="sm" variant="tonal">
                Action
              </Button>
            </CardFooter>
          </Card>
          <Card hoverable>
            <CardHeader>
              <CardTitle>Hoverable Card</CardTitle>
              <CardDescription>Hover me for shadow.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-on-surface-variant text-sm">Interactive card example.</p>
            </CardContent>
          </Card>
        </div>
      </Section>

      {/* Dialog */}
      <Section title="Dialog">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="secondary">Open Dialog</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm action</DialogTitle>
              <DialogDescription>Are you sure you want to proceed?</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost" size="sm">
                Cancel
              </Button>
              <Button size="sm">Confirm</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Section>

      {/* Toast */}
      <Section title="Toast">
        <ToastDemo />
      </Section>

      {/* Dropdown */}
      <Section title="Dropdown Menu">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="secondary">Options</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem>
              <Plus className="h-4 w-4" /> Add item
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Star className="h-4 w-4" /> Favorite
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <Trash2 className="h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </Section>

      {/* Select */}
      <Section title="Select">
        <div className="max-w-xs">
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Choose department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="engineering">Engineering</SelectItem>
              <SelectItem value="design">Design</SelectItem>
              <SelectItem value="marketing">Marketing</SelectItem>
              <SelectItem value="sales">Sales</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Section>

      {/* Tabs */}
      <Section title="Tabs">
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="applicants">Applicants</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>
          <TabsContent value="overview">
            <p className="text-on-surface-variant text-sm">Overview content.</p>
          </TabsContent>
          <TabsContent value="applicants">
            <p className="text-on-surface-variant text-sm">Applicants content.</p>
          </TabsContent>
          <TabsContent value="settings">
            <p className="text-on-surface-variant text-sm">Settings content.</p>
          </TabsContent>
        </Tabs>
      </Section>

      {/* Tooltip */}
      <Section title="Tooltip">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="secondary">
                <Bell className="h-4 w-4" /> Hover me
              </Button>
            </TooltipTrigger>
            <TooltipContent>You have 3 notifications</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </Section>

      {/* Skeleton */}
      <Section title="Skeleton">
        <div className="max-w-sm space-y-3">
          <Skeleton variant="text" />
          <Skeleton variant="text" className="w-3/4" />
          <div className="flex gap-3">
            <Skeleton variant="circle" width={48} height={48} />
            <div className="flex-1 space-y-2">
              <Skeleton variant="text" />
              <Skeleton variant="text" className="w-1/2" />
            </div>
          </div>
          <Skeleton variant="rect" height={120} />
        </div>
      </Section>

      {/* Spinner */}
      <Section title="Spinner">
        <div className="flex items-center gap-4">
          <Spinner size="sm" />
          <Spinner size="md" />
          <Spinner size="lg" />
          <span className="text-primary">
            <Spinner size="md" />
          </span>
          <span className="text-danger">
            <Spinner size="md" />
          </span>
        </div>
      </Section>

      {/* EmptyState */}
      <Section title="Empty State">
        <EmptyState
          icon={<Inbox />}
          title="No applicants yet"
          description="Applicants will appear here once someone applies to this job posting."
          action={<Button size="sm">Share posting</Button>}
        />
      </Section>
    </div>
  );
}

export default function DevPage() {
  return (
    <ToastProvider>
      <DevContent />
    </ToastProvider>
  );
}
