"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { youtubeApi } from "@/services/api";
import toast from "react-hot-toast";

export default function Callback() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get("code");
      if (!code) {
        toast.error("No authorization code received");
        router.push("/");
        return;
      }

      try {
        const refreshToken = await youtubeApi.handleCallback(code);
        localStorage.setItem("youtube_refresh_token", refreshToken);
        await youtubeApi.setRefreshToken(refreshToken);
        toast.success("Successfully authenticated with YouTube");
        router.push("/");
      } catch (error) {
        console.error("Error handling callback:", error);
        toast.error("Failed to authenticate with YouTube");
        router.push("/");
      }
    };

    handleCallback();
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">
          Authenticating with YouTube...
        </h1>
        <p className="text-gray-600">
          Please wait while we complete the process.
        </p>
      </div>
    </div>
  );
}
