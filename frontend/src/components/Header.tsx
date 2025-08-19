import { Link, NavLink } from "react-router-dom";
import { ThemeToggle } from "./ui/ThemeToggle";

export default function Header() {
  return (
    <header className="sticky top-0 z-40 bg-gray-400 backdrop-blur border-b border-default">
      <div className="container-page flex h-16 justify-between">
        <Link to="/" viewTransition className="text-lg font-semibold">
          <span className="text-gradient">StadiumsHQ</span>
        </Link>
        <ThemeToggle />
      </div>
    </header>
  );
}
