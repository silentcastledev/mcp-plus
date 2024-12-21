import { useTheme } from "./parts/use-theme.tsx";
import { Theme } from "@radix-ui/themes";
import { useSignals } from "@preact/signals-react/runtime";
import { redirectPage, useRouterUpdates } from "./parts/signal-router.ts";
import { $router } from "./backbone/router.ts";
import { Error404Page } from "./parts/error-404-page.tsx";
import { UnreachableCaseError } from "./parts/unreachable-case-error.ts";
import { ServersIndexPage } from "./parts/servers-page/servers-index-page.tsx";
import { ServersAddPage } from "./parts/servers-page/servers-add-page.tsx";
import { ServersEditPage } from "./parts/servers-page/servers-edit-page.tsx";

function AppBody() {
  useSignals();
  const router = useRouterUpdates($router);
  const page = router.page;

  if (!page) {
    return <Error404Page />;
  }

  switch (page.route) {
    case "home": {
      redirectPage($router, "servers");
      return null;
    }
    case "servers":
      return <ServersIndexPage />;
    case "serversAdd":
      return <ServersAddPage />;
    case "serversEdit":
      return <ServersEditPage name={page.params.name} />;
    default:
      throw new UnreachableCaseError(page);
  }
}

export function App() {
  const theme = useTheme();
  return (
    <Theme accentColor={"blue"} grayColor="mauve" appearance={theme}>
      <AppBody />
    </Theme>
  );
}
