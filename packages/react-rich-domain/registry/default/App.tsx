import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "./theme.provider";
import { ToggleTheme } from "./components/toggle-theme";
import { UserList } from "./user-list-criteria";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark">
        <ToggleTheme />
        <section className="container mx-auto py-10">
          <h1 className="text-3xl font-bold mb-6">User Management</h1>
          <UserList />
        </section>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
