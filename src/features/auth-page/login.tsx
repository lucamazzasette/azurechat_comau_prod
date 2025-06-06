"use client";
import { AI_NAME } from "@/features/theme/theme-config";
import { signIn } from "next-auth/react";
import { FC } from "react";
import { AssistantAvatar } from "../ui/assistant-avatar";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";

interface LoginProps {
  isDevMode: boolean;
  githubEnabled: boolean;
  entraIdEnabled: boolean;
}

export const LogIn: FC<LoginProps> = (props) => {
  return (
    <Card className="flex gap-2 flex-col min-h-[500] min-w-[300px]">
      <CardHeader className="gap-2">
        <CardTitle className="text-2xl flex items-center gap-4">
          <div className="flex-shrink-0">
            <AssistantAvatar size={96} className="h-24 w-24" />
          </div>
          <span className="text-primary text-3xl">{AI_NAME}</span>
        </CardTitle>
        <CardDescription>
          Login in with your GitHub or Microsoft 365 account
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {props.githubEnabled && (
          <Button onClick={() => signIn("github")}>GitHub</Button>
        )}
        {props.entraIdEnabled && (
          <Button onClick={() => signIn("azure-ad")}>Microsoft 365</Button>
        )}
        {props.isDevMode && (
          <Button onClick={() => signIn("localdev")}>
            Basic Auth (DEV ONLY)
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
