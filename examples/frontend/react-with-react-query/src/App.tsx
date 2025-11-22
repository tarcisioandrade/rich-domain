import "./App.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { UserList } from "./user-list";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <UserList />
    </QueryClientProvider>
  );
}

export default App;
