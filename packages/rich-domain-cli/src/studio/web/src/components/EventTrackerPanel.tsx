import { useEffect, useState } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  AlertCircle,
  Calendar,
  RefreshCcw,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { EventState, TrackedEvent } from "../interfaces";

interface EventStatistics {
  total: number;
  byState: Record<EventState, number>;
  byEventName: Record<string, number>;
  byQueue: Record<string, number>;
  avgProcessingTime?: number;
  failureRate?: number;
}

interface EventTrackerPanelProps {
  onEventClick?: (event: TrackedEvent) => void;
  selectedEventId?: string | null;
}

export default function EventTrackerPanel({
  onEventClick,
  selectedEventId,
}: EventTrackerPanelProps) {
  const [events, setEvents] = useState<TrackedEvent[]>([]);
  const [stats, setStats] = useState<EventStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedState, setSelectedState] = useState<EventState | "all">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [isPackageInstalled, setIsPackageInstalled] = useState<boolean | null>(
    null
  );

  const fetchEvents = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (selectedState !== "all") {
        params.append("state", selectedState);
      }
      params.append("limit", "100");

      const response = await fetch(`/api/events?${params}`);
      const data = await response.json();

      if (data.success) {
        setEvents(data.data);
      } else {
        setError(data.error || "Failed to fetch events");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/events/stats");
      const data = await response.json();

      if (data.success) {
        setStats(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  };

  const checkPackageInstallation = async () => {
    try {
      const response = await fetch("/api/events-tracker-status");
      const data = await response.json();

      if (data.success) {
        setIsPackageInstalled(data.installed);
        // If package is not installed, set loading to false
        if (!data.installed) {
          setLoading(false);
        }
      }
    } catch (err) {
      console.error("Failed to check package installation:", err);
      setIsPackageInstalled(false);
      setLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm("Delete this event?")) return;

    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        // Trigger refresh
        await fetchEvents();
        await fetchStats();
      } else {
        console.error("Failed to delete event:", data.error);
      }
    } catch (error) {
      console.error("Error deleting event:", error);
    }
  };

  const handleClearFilteredEvents = async () => {
    if (!selectedState || selectedState === "all") return;

    const count = events.filter((e) => e.state === selectedState).length;

    if (!confirm(`Delete all ${count} ${selectedState} events?`)) return;

    try {
      const response = await fetch(`/api/events/state/${selectedState}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        console.log(`Deleted ${data.data.deleted} events`);
        // Trigger refresh
        await fetchEvents();
        await fetchStats();
      } else {
        console.error("Failed to delete events:", data.error);
      }
    } catch (error) {
      console.error("Error deleting events:", error);
    }
  };

  useEffect(() => {
    checkPackageInstallation();
  }, []);

  useEffect(() => {
    // Only fetch events if package is installed
    if (isPackageInstalled) {
      fetchEvents();
      fetchStats();
    }
  }, [selectedState, isPackageInstalled]);

  useEffect(() => {
    if (!autoRefresh || !isPackageInstalled) return;

    const interval = setInterval(() => {
      fetchEvents();
      fetchStats();
    }, 3000); // Refresh every 3 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, selectedState, isPackageInstalled]);

  const filteredEvents = events.filter((event) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      event.eventName.toLowerCase().includes(search) ||
      event.eventId.toLowerCase().includes(search) ||
      event.queueName?.toLowerCase().includes(search)
    );
  });

  const getStateColor = (state: EventState): string => {
    const colors: Record<EventState, string> = {
      pending: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
      active: "bg-blue-500/20 text-blue-300 border-blue-500/30",
      succeeded: "bg-green-500/20 text-green-300 border-green-500/30",
      failed: "bg-red-500/20 text-red-300 border-red-500/30",
      delayed: "bg-purple-500/20 text-purple-300 border-purple-500/30",
      retrying: "bg-orange-500/20 text-orange-300 border-orange-500/30",
      unknown: "bg-gray-500/20 text-gray-300 border-gray-500/30",
    };
    return colors[state] || colors.unknown;
  };

  const getStateIcon = (state: EventState): string => {
    const icons: Record<EventState, string> = {
      pending: "⏳",
      active: "⚡",
      succeeded: "✓",
      failed: "✗",
      delayed: "⏰",
      retrying: "🔄",
      unknown: "?",
    };
    return icons[state] || icons.unknown;
  };

  const formatDate = (date: string | Date): string => {
    const d = new Date(date);
    return d.toLocaleString("en-US", {
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      {/* Header with Stats */}
      <div className="border-b border-secondary p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-foreground">
            Event Tracker
          </h2>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={autoRefresh ? "bg-green-500/20" : ""}
            >
              {autoRefresh ? "🟢 Auto" : "⚪ Manual"}
            </Button>
            <Button variant="outline" size="sm" onClick={fetchEvents}>
              🔄 Refresh
            </Button>
          </div>
        </div>

        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-secondary/30 rounded-lg p-3">
              <div className="text-xs text-muted-foreground">Total</div>
              <div className="text-2xl font-bold text-foreground">
                {stats.total}
              </div>
            </div>
            <div className="bg-green-500/10 rounded-lg p-3">
              <div className="text-xs text-green-300">Succeeded</div>
              <div className="text-2xl font-bold text-green-400">
                {stats.byState.succeeded || 0}
              </div>
            </div>
            <div className="bg-red-500/10 rounded-lg p-3">
              <div className="text-xs text-red-300">Failed</div>
              <div className="text-2xl font-bold text-red-400">
                {stats.byState.failed || 0}
              </div>
            </div>
            <div className="bg-yellow-500/10 rounded-lg p-3">
              <div className="text-xs text-yellow-300">Pending</div>
              <div className="text-2xl font-bold text-yellow-400">
                {stats.byState.pending || 0}
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex gap-2 flex-wrap">
          {(
            [
              "all",
              "pending",
              "active",
              "succeeded",
              "failed",
              "delayed",
              "retrying",
            ] as const
          ).map((state) => (
            <button
              key={state}
              onClick={() => setSelectedState(state)}
              className={`px-3 py-1.5 rounded text-sm transition-colors ${
                selectedState === state
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary hover:bg-secondary/80 text-muted-foreground"
              }`}
            >
              {state === "all"
                ? `All (${stats?.total || 0})`
                : `${state.charAt(0).toUpperCase() + state.slice(1)} (${
                    stats?.byState[state] || 0
                  })`}
            </button>
          ))}

          {/* Clear All Button - show only when a specific state is filtered */}
          {selectedState && selectedState !== "all" && (
            <button
              onClick={handleClearFilteredEvents}
              className="px-3 py-1.5 rounded text-sm bg-red-500/20 border border-red-500/30 text-red-300 hover:bg-red-500/30 transition-colors flex items-center gap-1"
            >
              <Trash2 className="size-3" />
              Clear All {selectedState}
            </button>
          )}
        </div>

        {/* Search */}
        <Input
          type="text"
          placeholder="Search by event name, ID, or queue..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-secondary border-secondary"
        />
      </div>

      {/* Events List */}
      <div className="flex-1 overflow-auto p-4">
        {isPackageInstalled === null || (loading && events.length === 0) ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Loading events...
          </div>
        ) : isPackageInstalled === false ? (
          <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto text-center space-y-6 p-8">
            <div className="w-20 h-20 rounded-full bg-yellow-500/10 flex items-center justify-center">
              <AlertCircle className="size-10 text-yellow-400" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-foreground">
                Event Tracker Not Configured
              </h3>
              <p className="text-muted-foreground">
                The event tracker is not set up in your application. Configure
                it to start tracking domain events.
              </p>
            </div>

            <div className="flex gap-3">
              <a
                href="https://github.com/4lessandrodev/rich-domain"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
              >
                📚 View Documentation
              </a>
              <button
                onClick={checkPackageInstallation}
                className="px-4 py-2 bg-secondary text-foreground rounded hover:bg-secondary/80 transition-colors flex items-center gap-2"
              >
                <RefreshCcw className="size-4" />
                Retry Connection
              </button>
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto text-center space-y-4 p-8">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
              <AlertCircle className="size-8 text-red-400" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">
                Error Loading Events
              </h3>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <button
              onClick={fetchEvents}
              className="px-4 py-2 bg-secondary text-foreground rounded hover:bg-secondary/80 transition-colors flex items-center gap-2"
            >
              <RefreshCcw className="size-4" />
              Retry
            </button>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            No events found
          </div>
        ) : (
          <div className="space-y-2">
            {filteredEvents.map((event) => (
              <div
                key={event.eventId}
                onClick={() => onEventClick?.(event)}
                className={`
                  group relative
                  bg-secondary/50 rounded-lg p-4 cursor-pointer transition-all
                  hover:bg-secondary/70 border border-transparent
                  ${
                    selectedEventId === event.eventId
                      ? "border-primary bg-secondary"
                      : ""
                  }
                `}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`
                          px-2 py-0.5 rounded text-xs font-medium border
                          ${getStateColor(event.state)}
                        `}
                      >
                        {getStateIcon(event.state)} {event.state}
                      </span>
                      {event.queueName && (
                        <span className="px-2 py-0.5 rounded text-xs bg-secondary border border-secondary text-white">
                          {event.queueName}
                        </span>
                      )}
                    </div>

                    <div className="space-y-0.5">
                      <h3 className="font-semibold text-foreground truncate">
                        {event.eventName}
                      </h3>
                      <div className="truncate text-xs">
                        ID: {event.eventId}
                      </div>
                    </div>

                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <Calendar className="size-3" />{" "}
                          {formatDate(event.createdAt)}
                        </div>
                        {event.metadata?.attempts &&
                        event.metadata.attempts > 0 ? (
                          <div className="flex items-center gap-1">
                            <RefreshCcw className="size-3" /> Attempts:{" "}
                            {event.metadata.attempts}
                          </div>
                        ) : null}
                        {event.retryCount && event.retryCount > 0 ? (
                          <div className="flex items-center gap-1">
                            <RotateCcw className="size-3" /> {event.retryCount}{" "}
                            {event.retryCount === 1 ? "retry" : "retries"}
                          </div>
                        ) : null}
                        {event.metadata?.error && (
                          <div className="truncate text-red-400 flex items-center gap-1">
                            <AlertCircle className="size-3" />{" "}
                            {event.metadata.error}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteEvent(event.eventId);
                  }}
                  className="absolute top-2 right-2 p-1 rounded hover:bg-red-500/20 transition-colors opacity-0 group-hover:opacity-100"
                  title="Delete event"
                >
                  <Trash2 className="size-4 text-red-400 hover:text-red-300" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
