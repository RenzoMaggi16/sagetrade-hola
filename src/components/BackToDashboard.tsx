import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export const BackToDashboard = () => {
  return (
    <Link
      to="/#dashboard"
      className="back-to-dashboard"
    >
      <ArrowLeft className="h-4 w-4" />
      <span>Dashboard</span>
    </Link>
  );
};
