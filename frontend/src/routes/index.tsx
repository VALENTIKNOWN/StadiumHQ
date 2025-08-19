import type { RouteObject } from "react-router-dom";
// import Landing from "@/components/Landing";
import StadiumDetails from "@/components/StadiumDetails";

const routes: RouteObject[] = [
//   { path: "/", element: <Landing /> },
  { path: "/stadiums/:id", element: <StadiumDetails /> }
];

export default routes;
