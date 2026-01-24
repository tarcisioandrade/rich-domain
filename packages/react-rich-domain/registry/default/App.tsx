import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "./theme.provider";
import { ToggleTheme } from "./components/toggle-theme";
import { UserListCriteria } from "./user-list-criteria";
import { UserTimeline } from "./user-timeline";
import { TaskKanban } from "./task-kanban";
import { Tabs, TabsContent } from "./components/ui/tabs";
import { Table, Clock, SortAsc, Filter, Kanban } from "lucide-react";
import { SortingExample } from "./components/sorting/sorting-example";
import { FilterExample } from "./components/filter/filter-example";
import { cn } from "./lib/utils";
import { Toaster } from "sonner";

const queryClient = new QueryClient();

type DemoTab = "table" | "timeline" | "kanban" | "sorting" | "filter";

function clearParams() {
  window.history.pushState(null, "", window.location.pathname);
}

export default function App() {
  const defaultTab = (window.location.hash as DemoTab | undefined) || "#table";
  const [activeTab, setActiveTab] = useState<DemoTab>(
    defaultTab.replace("#", "") as DemoTab
  );

  function handleTabChange(tab: DemoTab) {
    clearParams();
    setActiveTab(tab);
    window.history.pushState(null, "", `#${tab}`);
  }

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark">
        <div className="min-h-screen bg-background container mx-auto">
          {/* Header */}
          <header className="w-[280px] py-6 fixed h-full flex flex-col top-0 bottom-0 z-50 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
            <h1 className="text-lg font-semibold">Rich Domain Components</h1>
            <span className="text-xs text-muted-foreground">
              Data-driven UI examples
            </span>
            <ul className="flex flex-col gap-2 mt-6">
              <li
                className={cn(
                  "flex items-center gap-2 cursor-pointer rounded p-2 hover:bg-muted hover:text-foreground text-sm text-muted-foreground",
                  activeTab === "table" && "text-foreground bg-muted"
                )}
                onClick={() => handleTabChange("table")}
              >
                <Table className="h-4 w-4" />
                Data Table
              </li>
              <li
                className={cn(
                  "flex items-center gap-2 cursor-pointer rounded p-2 hover:bg-muted hover:text-foreground text-sm text-muted-foreground",
                  activeTab === "timeline" && "text-foreground bg-muted"
                )}
                onClick={() => handleTabChange("timeline")}
              >
                <Clock className="h-4 w-4" />
                Timeline
              </li>
              <li
                className={cn(
                  "flex items-center gap-2 cursor-pointer rounded p-2 hover:bg-muted hover:text-foreground text-sm text-muted-foreground",
                  activeTab === "kanban" && "text-foreground bg-muted"
                )}
                onClick={() => handleTabChange("kanban")}
              >
                <Kanban className="h-4 w-4" />
                Kanban Board
              </li>
              <li
                className={cn(
                  "flex items-center gap-2 cursor-pointer rounded p-2 hover:bg-muted hover:text-foreground text-sm text-muted-foreground",
                  activeTab === "sorting" && "text-foreground bg-muted"
                )}
                onClick={() => handleTabChange("sorting")}
              >
                <SortAsc className="h-4 w-4" />
                Sorting
              </li>
              <li
                className={cn(
                  "flex items-center gap-2 cursor-pointer rounded p-2 hover:bg-muted hover:text-foreground text-sm text-muted-foreground",
                  activeTab === "filter" && "text-foreground bg-muted"
                )}
                onClick={() => handleTabChange("filter")}
              >
                <Filter className="h-4 w-4" />
                Filter
              </li>
            </ul>
            <div className="mt-auto">
              <ToggleTheme />
            </div>
          </header>

          {/* Main Content */}
          <main className="container py-6 mx-auto pl-[296px]">
            <Tabs value={activeTab}>
              <TabsContent value="table" className="mt-0">
                <div className="space-y-4">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight">
                      Data Table
                    </h2>
                    <p className="text-muted-foreground">
                      Tabela com filtros, ordenação e paginação
                    </p>
                  </div>
                  <UserListCriteria />
                </div>
              </TabsContent>

              <TabsContent value="timeline" className="mt-0">
                <div className="space-y-4">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight">
                      Timeline
                    </h2>
                    <p className="text-muted-foreground">
                      Linha do tempo com infinite scroll e agrupamento por data
                    </p>
                  </div>
                  <UserTimeline />
                </div>
              </TabsContent>

              <TabsContent value="kanban" className="mt-0">
                <div className="space-y-4">
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight">
                      Kanban Board
                    </h2>
                    <p className="text-muted-foreground">
                      Drag and drop cards between columns with optimistic
                      updates
                    </p>
                  </div>
                  <TaskKanban />
                </div>
              </TabsContent>

              <TabsContent value="sorting" className="mt-0">
                <SortingExample />
              </TabsContent>
              <TabsContent value="filter" className="mt-0">
                <FilterExample />
              </TabsContent>
            </Tabs>
          </main>
        </div>
      </ThemeProvider>
      <Toaster position="bottom-right" />
    </QueryClientProvider>
  );
}
