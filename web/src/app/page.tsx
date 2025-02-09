"use client";

import { useState, useEffect } from "react";
import { youtubeApi, videoApi, ViralMomentAnalysis } from "@/services/api";
import { ArrowUpTrayIcon } from "@heroicons/react/24/solid";
import toast, { Toaster } from "react-hot-toast";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [uploadedVideoPath, setUploadedVideoPath] = useState<string>("");
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string>("");
  const [viralMoments, setViralMoments] = useState<ViralMomentAnalysis[]>([]);
  const [selectedMoment, setSelectedMoment] =
    useState<ViralMomentAnalysis | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<string>("");
  const [youtubeVideoUrl, setYoutubeVideoUrl] = useState<string>("");

  useEffect(() => {
    // Check if we have a refresh token in localStorage
    const refreshToken = localStorage.getItem("youtube_refresh_token");
    if (refreshToken) {
      youtubeApi.setRefreshToken(refreshToken);
      setIsAuthenticated(true);
    }
  }, []);

  const handleAuth = async () => {
    try {
      const authUrl = await youtubeApi.getAuthUrl();
      window.location.href = authUrl;
    } catch (error) {
      console.error("Error getting auth URL:", error);
      toast.error("Failed to get authentication URL");
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setViralMoments([]);
      setSelectedMoment(null);
      setUploadedVideoPath("");
      setUploadedVideoUrl("");
    }
  };

  const handleUploadOriginal = async () => {
    if (!selectedFile) {
      toast.error("Please select a video file");
      return;
    }

    setIsUploading(true);
    try {
      const result = await videoApi.uploadOriginal(selectedFile);
      setUploadedVideoPath(result.path);
      // Create a URL for the uploaded video
      setUploadedVideoUrl(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/${
          result.path
        }`
      );
      toast.success("Video uploaded successfully!");
    } catch (error) {
      console.error("Error uploading video:", error);
      toast.error("Failed to upload video");
    } finally {
      setIsUploading(false);
    }
  };

  const handleAnalyzeVideo = async () => {
    if (!uploadedVideoPath) {
      toast.error("Please upload a video first");
      return;
    }

    setIsAnalyzing(true);
    try {
      const moments = await videoApi.analyzeVideo(uploadedVideoPath);
      setViralMoments(moments);
      toast.success("Video analysis completed!");
    } catch (error) {
      console.error("Error analyzing video:", error);
      toast.error("Failed to analyze video");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleProcessMoment = async (moment: ViralMomentAnalysis) => {
    setIsProcessing(true);
    try {
      const result = await videoApi.editVideo({
        videoPath: uploadedVideoPath,
        moment,
        outputFormat: "mp4",
        includeCaption: true,
        includeHashtags: true,
      });
      const outputPath = result.outputPath;
      setSelectedVideo(outputPath);

      // Update form with suggested metadata
      setTitle(moment.suggestedTitle);
      setTags(moment.suggestedHashtags.join(", "));
      setDescription(moment.description);

      toast.success("Moment processed successfully!");
      setSelectedMoment(moment);
    } catch (error) {
      console.error("Error processing moment:", error);
      toast.error("Failed to process moment");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUploadToYoutube = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVideo || !selectedMoment) {
      toast.error("Please process a viral moment first");
      return;
    }

    setIsUploading(true);
    try {
      const response = await youtubeApi.uploadVideo({
        videoPath: selectedVideo,
        title: selectedMoment.suggestedTitle,
        description: selectedMoment.description,
        tags: selectedMoment.suggestedHashtags.map((tag) => tag.trim()),
        isPrivate,
      });

      toast.success("Video uploaded to YouTube successfully!");
      setYoutubeVideoUrl(response.videoUrl);

      // Reset form
      setSelectedFile(null);
      setTitle("");
      setDescription("");
      setTags("");
      setIsPrivate(false);
      setViralMoments([]);
      setSelectedMoment(null);
      setUploadedVideoPath("");
    } catch (error) {
      console.error("Error uploading to YouTube:", error);
      toast.error("Failed to upload to YouTube");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <main className="min-h-screen p-8">
      <Toaster position="top-right" />
      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">YouTube Shorts Uploader</h1>

        {!isAuthenticated && (
          <button
            onClick={handleAuth}
            className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors"
          >
            Authenticate with YouTube
          </button>
        )}

        {isAuthenticated && (
          <div className="space-y-8">
            {/* Video Upload Section */}
            <div className="border rounded-lg p-6">
              <h2 className="text-xl font-semibold mb-4">
                1. Upload Original Video
              </h2>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="video-upload"
                />
                <label
                  htmlFor="video-upload"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <ArrowUpTrayIcon className="h-12 w-12 text-gray-400" />
                  <span className="mt-2 text-sm text-gray-500">
                    {selectedFile ? selectedFile.name : "Click to upload video"}
                  </span>
                </label>
              </div>
              {selectedFile && !uploadedVideoPath && (
                <button
                  onClick={handleUploadOriginal}
                  disabled={isUploading}
                  className="mt-4 w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400"
                >
                  {isUploading ? "Uploading..." : "Upload Video"}
                </button>
              )}

              {/* Video Preview */}
              {uploadedVideoUrl && (
                <div className="mt-6">
                  <h3 className="text-lg font-medium mb-2">Video Preview</h3>
                  <video
                    src={uploadedVideoUrl}
                    controls
                    className="w-full rounded-lg"
                    style={{ maxHeight: "400px" }}
                  >
                    Your browser does not support the video tag.
                  </video>
                </div>
              )}
            </div>

            {/* Analysis Section */}
            {uploadedVideoPath && (
              <div className="border rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">2. Analyze Video</h2>
                <button
                  onClick={handleAnalyzeVideo}
                  disabled={isAnalyzing}
                  className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400"
                >
                  {isAnalyzing ? "Analyzing..." : "Analyze Video"}
                </button>
              </div>
            )}

            {/* Viral Moments Section */}
            {viralMoments.length > 0 && (
              <div className="border rounded-lg p-6">
                <h2 className="text-xl font-semibold mb-4">
                  3. Select Viral Moment
                </h2>
                <div className="space-y-4">
                  {viralMoments.map((moment, index) => (
                    <div
                      key={index}
                      className="border rounded p-4 cursor-pointer hover:bg-gray-50"
                      onClick={() => handleProcessMoment(moment)}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-medium">
                            {moment.suggestedTitle}
                          </h3>
                          <p className="text-sm text-gray-600">
                            Duration: {moment.duration} (from {moment.startTime}{" "}
                            to {moment.endTime})
                          </p>
                          <p className="text-sm text-gray-600">
                            Viral Potential: {moment.viralPotential}
                          </p>
                        </div>
                        <button
                          className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition-colors"
                          disabled={isProcessing}
                        >
                          {isProcessing ? "Processing..." : "Process"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* YouTube Upload Form */}
            {selectedMoment && (
              <div className="space-y-8">
                <form
                  onSubmit={handleUploadToYoutube}
                  className="border rounded-lg p-6 space-y-6"
                >
                  <h2 className="text-xl font-semibold">
                    4. Upload to YouTube
                  </h2>
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Title
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Description
                    </label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg"
                      rows={4}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Tags (comma-separated)
                    </label>
                    <input
                      type="text"
                      value={tags}
                      onChange={(e) => setTags(e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg"
                      placeholder="tag1, tag2, tag3"
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="private"
                      checked={isPrivate}
                      onChange={(e) => setIsPrivate(e.target.checked)}
                      className="mr-2"
                    />
                    <label htmlFor="private" className="text-sm font-medium">
                      Upload as private
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={isUploading}
                    className="w-full bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-400"
                  >
                    {isUploading ? "Uploading..." : "Upload to YouTube"}
                  </button>
                </form>

                {/* YouTube Video Preview */}
                {youtubeVideoUrl && (
                  <div className="border rounded-lg p-6">
                    <h2 className="text-xl font-semibold mb-4">
                      Uploaded YouTube Short
                    </h2>
                    <div className="aspect-[9/16] w-full max-w-sm mx-auto">
                      <iframe
                        src={youtubeVideoUrl.replace(
                          "youtube.com/shorts/",
                          "youtube.com/embed/"
                        )}
                        className="w-full h-full rounded-lg"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                    <div className="mt-4 text-center">
                      <a
                        href={youtubeVideoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Open in YouTube
                      </a>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
