import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "./theme.provider";
import { ToggleTheme } from "./components/toggle-theme";
import { UserFilterExample } from "./components/filter/filter-example";
// import { OrderFilterExample, UserFilterExample } from "./components/filter/filter-example";

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark">
        <ToggleTheme />
        <section className="container mx-auto">
          {/* <UserList /> */}
          <UserFilterExample />
          {/* <OrderFilterExample /> */}
        </section>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
