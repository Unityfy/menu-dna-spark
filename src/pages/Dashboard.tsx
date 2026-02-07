import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="text-center space-y-6 max-w-lg">
        <h1 className="font-[var(--font-display)] text-4xl font-bold tracking-tight text-foreground">
          Welcome to Menu <span className="text-primary">DNA</span>
        </h1>
        <p className="text-muted-foreground">
          Signed in as <span className="text-foreground">{user?.email}</span>
        </p>
        <Button variant="outline" onClick={handleSignOut}>
          Sign Out
        </Button>
      </div>
    </div>
  );
};

export default Dashboard;
