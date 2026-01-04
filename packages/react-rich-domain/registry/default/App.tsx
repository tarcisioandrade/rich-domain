import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "./theme.provider";
import { ToggleTheme } from "./components/toggle-theme";
import { UserListCriteria } from "./user-list-criteria";
import { UserTimeline } from "./user-timeline";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./components/ui/tabs";
import { Table, Clock, SortAsc, Filter } from "lucide-react";
import { SortingExample } from "./components/sorting/sorting-example";
import { useCriteria } from "./hooks/use-criteria";
import { FilterExample } from "./components/filter/filter-example";

const queryClient = new QueryClient();

type DemoTab = "table" | "timeline" | "sorting" | "filter";

export default function App() {
  const { clearAll } = useCriteria({ syncWithUrl: true });
  const defaultTab =
    (window.location.hash as DemoTab | undefined) || "#timeline";
  const [activeTab, setActiveTab] = useState<DemoTab>(
    defaultTab.replace("#", "") as DemoTab
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark">
        <div className="min-h-screen bg-background container mx-auto">
          {/* Header */}
          <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
            <div className="container flex h-14 items-center justify-between">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold">
                  Rich Domain Components
                </h1>
                <span className="text-xs text-muted-foreground">
                  Data-driven UI examples
                </span>
              </div>
              <ToggleTheme />
            </div>
          </header>

          {/* Main Content */}
          <main className="container mx-auto py-6">
            <Tabs
              value={activeTab}
              onValueChange={(v) => {
                clearAll();
                setActiveTab(v as DemoTab);
                window.history.pushState(null, "", `#${v}`);
              }}
            >
              <TabsList className="grid w-full max-w-md grid-cols-4">
                <TabsTrigger value="table" className="gap-2">
                  <Table className="h-4 w-4" />
                  Data Table
                </TabsTrigger>
                <TabsTrigger value="timeline" className="gap-2">
                  <Clock className="h-4 w-4" />
                  Timeline
                </TabsTrigger>
                <TabsTrigger value="sorting" className="gap-2">
                  <SortAsc className="h-4 w-4" />
                  Sorting
                </TabsTrigger>
                <TabsTrigger value="filter" className="gap-2">
                  <Filter className="h-4 w-4" />
                  Filter
                </TabsTrigger>
              </TabsList>

              <div className="mt-6">
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
                        Linha do tempo com infinite scroll e agrupamento por
                        data
                      </p>
                    </div>
                    <UserTimeline />
                  </div>
                </TabsContent>
                <TabsContent value="sorting" className="mt-0">
                  <SortingExample />
                </TabsContent>
                <TabsContent value="filter" className="mt-0">
                  <FilterExample />
                </TabsContent>
              </div>
            </Tabs>
          </main>
        </div>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
