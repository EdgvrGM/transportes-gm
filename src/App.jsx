import "./App.css";
import Pages from "@/pages/index.jsx";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider"; // <--- Importar

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      {" "}
      {/* <--- Envolver */}
      <Pages />
      <Toaster />
    </ThemeProvider>
  );
}

export default App;
