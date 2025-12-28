import { DomainEventInfo, DomainStructure } from "../interfaces";
import { Input } from "./ui/input";
import { Search, Zap } from "lucide-react";
import { useState } from "react";
import { cn } from "../lib/utils";

interface EventsPanelProps {
  domain: DomainStructure | null;
  loading: boolean;
  selectedEvent: string | null;
  onEventClick: (event: DomainEventInfo) => void;
}

export default function EventsPanel({
  domain,
  loading,
  selectedEvent,
  onEventClick,
}: EventsPanelProps) {
  const [searchTerm, setSearchTerm] = useState("");

  if (loading) {
    return (
      <div className="w-64 bg-gray-800 border-r border-gray-700 p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-700 rounded mb-4"></div>
          <div className="h-4 bg-gray-700 rounded mb-2"></div>
          <div className="h-4 bg-gray-700 rounded mb-2"></div>
          <div className="h-4 bg-gray-700 rounded"></div>
        </div>
      </div>
    );
  }

  if (!domain || domain.events.length === 0) {
    return (
      <div className="w-64 bg-gray-800 border-r border-gray-700 p-4">
        <div className="text-sm text-gray-500">
          <p>No domain events found.</p>
          <p className="mt-2">
            Domain events extend DomainEvent&lt;PayloadType&gt;
          </p>
        </div>
      </div>
    );
  }

  // Filter events based on search term
  const filteredEvents = domain.events.filter((event) => {
    const matchesSearch =
      searchTerm.trim() === "" ||
      event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.payloadType.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  const hasResults = filteredEvents.length > 0;

  return (
    <aside className="flex w-64 flex-col border-r border-border bg-sidebar">
      <header className="flex flex-col gap-3 border-b border-sidebar-border p-4">
        <div className="flex items-center gap-2">
          <Zap className="size-5 text-yellow-400" />
          <h2 className="text-sm font-semibold">Domain Events</h2>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search events..."
            className="pl-9 bg-sidebar-accent border-sidebar-border"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="text-xs text-muted-foreground">
          {filteredEvents.length} event{filteredEvents.length !== 1 ? "s" : ""}
        </div>
      </header>

      {/* Event List */}
      <div className="flex-1 overflow-y-auto space-y-1 px-2 py-3">
        {!hasResults ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <p className="text-sm text-muted-foreground mb-1">
              No events found
            </p>
            <p className="text-xs text-muted-foreground/70">
              Try adjusting your search
            </p>
          </div>
        ) : (
          <>
            {filteredEvents.map((event) => (
              <EventItem
                key={event.name}
                event={event}
                isSelected={event.name === selectedEvent}
                onEventClick={onEventClick}
              />
            ))}
          </>
        )}
      </div>
    </aside>
  );
}

function EventItem({
  event,
  isSelected,
  onEventClick,
}: {
  event: DomainEventInfo;
  isSelected: boolean;
  onEventClick: (event: DomainEventInfo) => void;
}) {
  return (
    <button
      onClick={() => onEventClick(event)}
      className={cn(
        "w-full flex flex-col gap-1 rounded-md px-3 py-2.5 text-left text-sm transition-colors",
        isSelected
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground hover:bg-sidebar-accent/50"
      )}
    >
      <div className="flex items-center gap-2">
        <Zap className="size-3.5 flex-shrink-0 text-yellow-400" />
        <span className="flex-1 truncate font-medium font-mono text-sm">
          {event.name}
        </span>
      </div>

      <div className="flex items-center gap-2 ml-5 text-xs text-muted-foreground">
        <span>
          {event.publishers.length} publisher{event.publishers.length !== 1 ? "s" : ""}
        </span>
        <span>•</span>
        <span>
          {event.handlers.length} handler{event.handlers.length !== 1 ? "s" : ""}
        </span>
      </div>
    </button>
  );
}
