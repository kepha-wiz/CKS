'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import { 
  MessageCircle, 
  Download, 
  Youtube, 
  Instagram, 
  Music, 
  Video, 
  Image,
  Sparkles,
  Zap,
  Globe,
  Loader2,
  CheckCircle,
  AlertCircle,
  Copy,
  Trash2,
  Share2,
  Play,
  FileAudio,
  FileImage,
  FileVideo,
  RefreshCw,
  Database
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface DownloadItem {
  id: string;
  platform: 'youtube' | 'tiktok' | 'instagram';
  url: string;
  status: 'idle' | 'processing' | 'completed' | 'error';
  downloadData?: any;
  error?: string;
}

interface RealMediaFile {
  filename: string;
  type: string;
  size: number;
  sizeFormatted: string;
  url: string;
  createdAt: Date;
  modifiedAt: Date;
}

export default function CKSAI() {
  const [activeTab, setActiveTab] = useState('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState('');
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [realMediaFiles, setRealMediaFiles] = useState<RealMediaFile[]>([]);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);

  const handleSendMessage = async () => {
    if (!currentMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: currentMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: currentMessage }),
      });

      if (!response.ok) throw new Error('Failed to get response');

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyMessage = async (content: string) => {
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(content);
      } else {
        // Fallback for older browsers or insecure contexts
        const textArea = document.createElement('textarea');
        textArea.value = content;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
          document.execCommand('copy');
        } catch (err) {
          console.error('Failed to copy text: ', err);
        }
        
        document.body.removeChild(textArea);
      }
      // Show success feedback
      alert('Message copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy text: ', err);
      alert('Failed to copy message');
    }
  };

  const handleClearChat = () => {
    setMessages([]);
  };

  const handleShareChat = async () => {
    const chatText = messages.map(msg => `${msg.role}: ${msg.content}`).join('\n\n');
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(chatText);
      } else {
        // Fallback for older browsers or insecure contexts
        const textArea = document.createElement('textarea');
        textArea.value = chatText;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
          document.execCommand('copy');
        } catch (err) {
          console.error('Failed to copy text: ', err);
        }
        
        document.body.removeChild(textArea);
      }
      // Show success feedback
      alert('Chat history copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy text: ', err);
      alert('Failed to copy chat history');
    }
  };

  const handleActualDownload = async (downloadItem: DownloadItem, downloadOption: any) => {
    try {
      // Handle YouTube downloads differently
      if (downloadItem.platform === 'youtube' && downloadItem.downloadData?.videoInfo) {
        const quality = downloadOption.quality || downloadOption.label;
        
        // Download the actual YouTube video
        const response = await fetch('/api/youtube-downloader', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            url: downloadItem.url, 
            action: 'download', 
            quality 
          }),
        });

        if (!response.ok) throw new Error('YouTube download failed');

        const data = await response.json();
        
        if (data.success && data.downloadInfo) {
          // Create download link for the downloaded file
          const link = document.createElement('a');
          link.href = data.downloadInfo.downloadUrl;
          link.download = data.downloadInfo.filename;
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          setTimeout(() => {
            document.body.removeChild(link);
          }, 100);
          
          alert(`YouTube video downloaded: ${quality} (${data.downloadInfo.sizeFormatted})`);
        } else {
          throw new Error(data.error || 'Download failed');
        }
      } else {
        // Handle other platforms (existing logic)
        const downloadUrl = downloadOption.actualDownloadUrl || downloadOption.url;
        const filename = downloadOption.filename;
        
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
          document.body.removeChild(link);
        }, 100);
        
        alert(`Download started: ${downloadOption.label} for ${downloadItem.platform}`);
      }
    } catch (error) {
      console.error('Download failed:', error);
      alert('Download failed. Please try again.');
    }
  };

  const handleClearDownloads = () => {
    setDownloads([]);
  };

  // Real media functions
  const loadRealMediaFiles = async () => {
    try {
      setIsLoadingMedia(true);
      const response = await fetch('/api/real-media');
      const data = await response.json();
      
      if (data.success) {
        setRealMediaFiles(data.files.map((file: any) => ({
          ...file,
          createdAt: new Date(file.createdAt),
          modifiedAt: new Date(file.modifiedAt)
        })));
      }
    } catch (error) {
      console.error('Failed to load real media files:', error);
    } finally {
      setIsLoadingMedia(false);
    }
  };

  const downloadRealMedia = async (type: string = 'all') => {
    try {
      setIsLoadingMedia(true);
      const response = await fetch(`/api/real-media?action=download&type=${type}`);
      const data = await response.json();
      
      if (data.success) {
        // Reload the files list
        await loadRealMediaFiles();
        alert(`Successfully downloaded ${data.files.length} real media files!`);
      } else {
        alert('Failed to download real media files');
      }
    } catch (error) {
      console.error('Failed to download real media files:', error);
      alert('Failed to download real media files');
    } finally {
      setIsLoadingMedia(false);
    }
  };

  const handleDownloadFile = async (filename: string, url: string) => {
    try {
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        document.body.removeChild(link);
      }, 100);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Download failed. Please try again.');
    }
  };

  const getMediaIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <FileImage className="h-4 w-4" />;
      case 'audio':
        return <FileAudio className="h-4 w-4" />;
      case 'video':
        return <FileVideo className="h-4 w-4" />;
      default:
        return <Database className="h-4 w-4" />;
    }
  };

  // Load real media files on component mount and when tab changes to download
  useEffect(() => {
    if (activeTab === 'download') {
      loadRealMediaFiles();
    }
  }, [activeTab]);

  const handleDownload = async () => {
    if (!downloadUrl.trim()) return;

    // Detect platform
    let platform: 'youtube' | 'tiktok' | 'instagram';
    if (downloadUrl.includes('youtube.com') || downloadUrl.includes('youtu.be')) {
      platform = 'youtube';
    } else if (downloadUrl.includes('tiktok.com')) {
      platform = 'tiktok';
    } else if (downloadUrl.includes('instagram.com')) {
      platform = 'instagram';
    } else {
      alert('Please enter a valid YouTube, TikTok, or Instagram URL');
      return;
    }

    const downloadItem: DownloadItem = {
      id: Date.now().toString(),
      platform,
      url: downloadUrl,
      status: 'processing'
    };

    setDownloads(prev => [...prev, downloadItem]);
    setDownloadUrl('');

    try {
      let response;
      
      if (platform === 'youtube') {
        // Use the new YouTube downloader API
        response = await fetch('/api/youtube-downloader', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url: downloadUrl, action: 'info' }),
        });
      } else {
        // Use the existing download API for other platforms
        response = await fetch('/api/download', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url: downloadUrl, platform }),
        });
      }

      if (!response.ok) throw new Error('Download failed');

      const data = await response.json();

      setDownloads(prev => 
        prev.map(item => 
          item.id === downloadItem.id 
            ? { ...item, status: 'completed', downloadData: data }
            : item
        )
      );
    } catch (error) {
      setDownloads(prev => 
        prev.map(item => 
          item.id === downloadItem.id 
            ? { ...item, status: 'error', error: 'Failed to download media' }
            : item
        )
      );
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'youtube':
        return <Youtube className="h-4 w-4" />;
      case 'tiktok':
        return <Music className="h-4 w-4" />;
      case 'instagram':
        return <Instagram className="h-4 w-4" />;
      default:
        return <Globe className="h-4 w-4" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'processing':
        return <Loader2 className="h-4 w-4 animate-spin" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm dark:bg-slate-900/80 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <div className="flex items-center space-x-2">
                <Sparkles className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  CKS AI
                </h1>
              </div>
              <Badge variant="secondary" className="text-xs hidden sm:inline-block">
                By CKS-Tech
              </Badge>
            </div>
            <div className="flex items-center space-x-1 sm:space-x-2 text-xs sm:text-sm text-muted-foreground">
              <Zap className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Powered by Advanced AI</span>
              <span className="sm:hidden">AI Powered</span>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-6 sm:py-8">
        <div className="text-center mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 sm:mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Your Ultimate AI Assistant
          </h2>
          <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
            Experience the power of AI with intelligent conversations and seamless media downloads from your favorite platforms
          </p>
        </div>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="max-w-4xl mx-auto">
          <TabsList className="grid w-full grid-cols-3 mb-4 sm:mb-6 h-12 sm:h-auto">
            <TabsTrigger value="chat" className="flex items-center justify-center space-x-1 sm:space-x-2 text-xs sm:text-sm">
              <MessageCircle className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>AI Chat</span>
            </TabsTrigger>
            <TabsTrigger value="download" className="flex items-center justify-center space-x-1 sm:space-x-2 text-xs sm:text-sm">
              <Download className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>Social Media</span>
            </TabsTrigger>
            <TabsTrigger value="real-media" className="flex items-center justify-center space-x-1 sm:space-x-2 text-xs sm:text-sm">
              <Database className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>Real Media</span>
            </TabsTrigger>
          </TabsList>

          {/* AI Chat Tab */}
          <TabsContent value="chat">
            <Card className="h-[500px] sm:h-[600px] flex flex-col">
              <CardHeader className="pb-3 sm:pb-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center space-x-2 text-lg sm:text-xl">
                    <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span>Ask Anything to CKS AI</span>
                  </CardTitle>
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleShareChat}
                      disabled={messages.length === 0}
                      className="h-8 w-8 sm:h-auto sm:w-auto sm:px-2"
                    >
                      <Share2 className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline ml-1">Share</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearChat}
                      disabled={messages.length === 0}
                      className="h-8 w-8 sm:h-auto sm:w-auto sm:px-2"
                    >
                      <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline ml-1">Clear</span>
                    </Button>
                  </div>
                </div>
                <CardDescription className="text-sm">
                  Get intelligent answers to any question using advanced AI technology
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col px-3 sm:px-6">
                <div className="flex-1 overflow-y-auto mb-3 sm:mb-4 space-y-3 sm:space-y-4 min-h-[300px] sm:min-h-[400px] max-h-[350px] sm:max-h-[400px]">
                  {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      <div className="text-center px-4">
                        <Sparkles className="h-8 w-8 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 opacity-50" />
                        <p className="text-sm sm:text-base">Start a conversation with CKS AI</p>
                        <p className="text-xs sm:text-sm">Ask me anything!</p>
                      </div>
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message.id}
                        className={cn(
                          "flex group",
                          message.role === 'user' ? 'justify-end' : 'justify-start'
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[85%] sm:max-w-[80%] rounded-lg px-3 py-2 sm:px-4 relative",
                            message.role === 'user'
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          )}
                        >
                          <div className="text-xs sm:text-sm break-words pr-6 prose prose-sm max-w-none dark:prose-invert">
                            {message.role === 'assistant' ? (
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                rehypePlugins={[rehypeRaw, rehypeHighlight]}
                                components={{
                                  a: ({ href, children }) => (
                                    <a 
                                      href={href} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:text-blue-800 underline"
                                    >
                                      {children}
                                    </a>
                                  ),
                                  ul: ({ children }) => (
                                    <ul className="list-disc pl-4 space-y-1">
                                      {children}
                                    </ul>
                                  ),
                                  ol: ({ children }) => (
                                    <ol className="list-decimal pl-4 space-y-1">
                                      {children}
                                    </ol>
                                  ),
                                  li: ({ children }) => (
                                    <li className="text-xs sm:text-sm">
                                      {children}
                                    </li>
                                  ),
                                  p: ({ children }) => (
                                    <p className="mb-2 last:mb-0">
                                      {children}
                                    </p>
                                  ),
                                  h1: ({ children }) => (
                                    <h1 className="text-lg font-bold mb-2">
                                      {children}
                                    </h1>
                                  ),
                                  h2: ({ children }) => (
                                    <h2 className="text-base font-bold mb-2">
                                      {children}
                                    </h2>
                                  ),
                                  h3: ({ children }) => (
                                    <h3 className="text-sm font-bold mb-1">
                                      {children}
                                    </h3>
                                  ),
                                  strong: ({ children }) => (
                                    <strong className="font-bold">
                                      {children}
                                    </strong>
                                  ),
                                  blockquote: ({ children }) => (
                                    <blockquote className="border-l-4 border-gray-300 pl-4 italic">
                                      {children}
                                    </blockquote>
                                  ),
                                  code: ({ inline, children }) => (
                                    inline ? (
                                      <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded text-xs">
                                        {children}
                                      </code>
                                    ) : (
                                      <code className="block bg-gray-100 dark:bg-gray-800 p-2 rounded text-xs overflow-x-auto">
                                        {children}
                                      </code>
                                    )
                                  ),
                                  hr: () => (
                                    <hr className="my-3 border-gray-300" />
                                  )
                                }}
                              >
                                {message.content}
                              </ReactMarkdown>
                            ) : (
                              <p>{message.content}</p>
                            )}
                          </div>
                          <p className="text-xs opacity-70 mt-1">
                            {message.timestamp.toLocaleTimeString()}
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyMessage(message.content)}
                            className="absolute top-1 right-1 h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-muted rounded-lg px-3 py-2 sm:px-4">
                        <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                  <Textarea
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    placeholder="Type your message here..."
                    className="flex-1 min-h-[50px] sm:min-h-[60px] resize-none text-sm"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <Button 
                    onClick={handleSendMessage} 
                    disabled={isLoading || !currentMessage.trim()}
                    className="px-4 sm:px-6 h-[50px] sm:h-auto"
                  >
                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Media Downloader Tab */}
          <TabsContent value="download">
            <div className="space-y-4 sm:space-y-6">
              <Card>
                <CardHeader className="pb-3 sm:pb-4">
                  <CardTitle className="flex items-center space-x-2 text-lg sm:text-xl">
                    <Download className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span>Download Media</span>
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Download audio, video, and images from YouTube, TikTok, and Instagram
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-3 sm:px-6">
                  <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
                    <Input
                      value={downloadUrl}
                      onChange={(e) => setDownloadUrl(e.target.value)}
                      placeholder="Enter YouTube, TikTok, or Instagram URL..."
                      className="flex-1 text-sm"
                    />
                    <Button 
                      onClick={handleDownload}
                      disabled={!downloadUrl.trim()}
                      className="w-full sm:w-auto"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-4 text-xs sm:text-sm text-muted-foreground">
                    <div className="flex items-center space-x-1">
                      <Youtube className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span>YouTube</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Music className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span>TikTok</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Instagram className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span>Instagram</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Downloads List */}
              {downloads.length > 0 && (
                <Card>
                  <CardHeader className="pb-3 sm:pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg sm:text-xl">Recent Downloads</CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearDownloads}
                        className="h-8 w-8 sm:h-auto sm:w-auto sm:px-2"
                      >
                        <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline ml-1">Clear</span>
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="px-3 sm:px-6">
                    <div className="space-y-3 sm:space-y-4 max-h-60 sm:max-h-80 overflow-y-auto">
                      {downloads.map((item) => (
                        <div
                          key={item.id}
                          className="border rounded-lg p-3 sm:p-4 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              {getPlatformIcon(item.platform)}
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate">
                                  {item.downloadData?.videoInfo?.title || item.downloadData?.metadata?.title || `Download from ${item.platform}`}
                                </p>
                                <p className="text-xs text-muted-foreground capitalize">
                                  {item.platform} • {item.downloadData?.processingTime || 'Processing...'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              {getStatusIcon(item.status)}
                            </div>
                          </div>
                          
                          {item.status === 'completed' && item.downloadData?.videoInfo && (
                            <div className="space-y-3">
                              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-2">
                                <p className="text-xs text-blue-700 dark:text-blue-300">
                                  Real YouTube video detected! Click below to download actual video file.
                                </p>
                              </div>
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-medium text-muted-foreground">Choose Quality:</p>
                                <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                                  <span>{item.downloadData.videoInfo.availableFormats.length} formats available</span>
                                </div>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {item.downloadData.videoInfo.availableFormats.map((format: any, index: number) => (
                                  <Button
                                    key={index}
                                    size="sm"
                                    variant="default"
                                    className="text-xs h-8 justify-start relative overflow-hidden"
                                    onClick={() => handleActualDownload(item, format)}
                                  >
                                    <Download className="h-3 w-3 mr-2 flex-shrink-0" />
                                    <div className="text-left min-w-0">
                                      <div className="truncate font-medium">{format.quality}</div>
                                      <div className="text-xs opacity-70">{format.size}</div>
                                    </div>
                                  </Button>
                                ))}
                              </div>
                            </div>
                          )}

                          {item.status === 'completed' && item.downloadData?.downloads && (
                            <div className="space-y-3">
                              {item.downloadData.disclaimer && (
                                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-2">
                                  <p className="text-xs text-blue-700 dark:text-blue-300">
                                    {item.downloadData.disclaimer}
                                  </p>
                                </div>
                              )}
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-medium text-muted-foreground">Choose Quality:</p>
                                {item.downloadData.stats && (
                                  <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                                    <span>{item.downloadData.stats.availableOptions}/{item.downloadData.downloads.length} available</span>
                                    <span>•</span>
                                    <span>{item.downloadData.stats.successRate}% success</span>
                                  </div>
                                )}
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {item.downloadData.downloads.map((downloadOption: any, index: number) => (
                                  <Button
                                    key={index}
                                    size="sm"
                                    variant={downloadOption.available ? "default" : "secondary"}
                                    disabled={!downloadOption.available}
                                    className="text-xs h-8 justify-start relative overflow-hidden"
                                    onClick={() => handleActualDownload(item, downloadOption)}
                                  >
                                    <Download className="h-3 w-3 mr-2 flex-shrink-0" />
                                    <div className="text-left min-w-0">
                                      <div className="truncate font-medium">{downloadOption.label}</div>
                                      <div className="text-xs opacity-70">{downloadOption.size}</div>
                                    </div>
                                    {downloadOption.downloadCount && (
                                      <div className="absolute top-1 right-1 text-xs opacity-50">
                                        {(downloadOption.downloadCount / 1000).toFixed(1)}k
                                      </div>
                                    )}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {item.status === 'error' && (
                            <p className="text-xs text-red-500">
                              {item.error || 'Failed to process download'}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* Real Media Tab */}
          <TabsContent value="real-media">
            <div className="space-y-4 sm:space-y-6">
              <Card>
                <CardHeader className="pb-3 sm:pb-4">
                  <CardTitle className="flex items-center space-x-2 text-lg sm:text-xl">
                    <Database className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span>Real Media Library</span>
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Download and manage real media files for learning purposes
                  </CardDescription>
                </CardHeader>
                <CardContent className="px-3 sm:px-6">
                  <div className="flex flex-wrap gap-2 mb-4">
                    <Button
                      onClick={() => downloadRealMedia('all')}
                      disabled={isLoadingMedia}
                      size="sm"
                      variant="default"
                    >
                      <Download className="h-3 w-3 mr-1" />
                      {isLoadingMedia ? 'Downloading...' : 'Download All Media'}
                    </Button>
                    <Button
                      onClick={() => downloadRealMedia('images')}
                      disabled={isLoadingMedia}
                      size="sm"
                      variant="outline"
                    >
                      <FileImage className="h-3 w-3 mr-1" />
                      Images
                    </Button>
                    <Button
                      onClick={() => downloadRealMedia('audio')}
                      disabled={isLoadingMedia}
                      size="sm"
                      variant="outline"
                    >
                      <FileAudio className="h-3 w-3 mr-1" />
                      Audio
                    </Button>
                    <Button
                      onClick={() => downloadRealMedia('videos')}
                      disabled={isLoadingMedia}
                      size="sm"
                      variant="outline"
                    >
                      <FileVideo className="h-3 w-3 mr-1" />
                      Videos
                    </Button>
                    <Button
                      onClick={loadRealMediaFiles}
                      disabled={isLoadingMedia}
                      size="sm"
                      variant="ghost"
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Refresh
                    </Button>
                  </div>
                  
                  <div className="text-xs text-muted-foreground mb-4">
                    Total files: {realMediaFiles.length} | 
                    Images: {realMediaFiles.filter(f => f.type === 'image').length} | 
                    Audio: {realMediaFiles.filter(f => f.type === 'audio').length} | 
                    Videos: {realMediaFiles.filter(f => f.type === 'video').length}
                  </div>
                </CardContent>
              </Card>

              {/* Real Media Files List */}
              {realMediaFiles.length > 0 && (
                <Card>
                  <CardHeader className="pb-3 sm:pb-4">
                    <CardTitle className="text-lg sm:text-xl">Available Files</CardTitle>
                  </CardHeader>
                  <CardContent className="px-3 sm:px-6">
                    <div className="space-y-3 sm:space-y-4 max-h-96 overflow-y-auto">
                      {realMediaFiles.map((file, index) => (
                        <div
                          key={index}
                          className="border rounded-lg p-3 sm:p-4 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              {getMediaIcon(file.type)}
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium truncate">
                                  {file.filename}
                                </p>
                                <p className="text-xs text-muted-foreground capitalize">
                                  {file.type} • {file.sizeFormatted} • {file.modifiedAt.toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleDownloadFile(file.filename, file.url)}
                                className="text-xs h-8"
                              >
                                <Download className="h-3 w-3 mr-1" />
                                Download
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {realMediaFiles.length === 0 && !isLoadingMedia && (
                <Card>
                  <CardContent className="pt-6 sm:pt-8 px-3 sm:px-6">
                    <div className="text-center text-muted-foreground">
                      <Database className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 opacity-50" />
                      <p className="text-sm sm:text-base mb-2">No real media files available</p>
                      <p className="text-xs sm:text-sm">Click "Download All Media" to get started with real media files for learning</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {isLoadingMedia && (
                <Card>
                  <CardContent className="pt-6 sm:pt-8 px-3 sm:px-6">
                    <div className="text-center text-muted-foreground">
                      <Loader2 className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 animate-spin" />
                      <p className="text-sm sm:text-base">Loading real media files...</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Features Section */}
        <div className="mt-12 sm:mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <Card className="text-center">
            <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
              <MessageCircle className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 text-primary" />
              <h3 className="text-base sm:text-lg font-semibold mb-2">Intelligent Chat</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Advanced AI conversations with context awareness and intelligent responses
              </p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
              <Download className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 text-primary" />
              <h3 className="text-base sm:text-lg font-semibold mb-2">Media Downloads</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Download high-quality content from YouTube, TikTok, and Instagram
              </p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
              <Zap className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 sm:mb-4 text-primary" />
              <h3 className="text-base sm:text-lg font-semibold mb-2">Lightning Fast</h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Optimized performance for quick responses and rapid downloads
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white/80 backdrop-blur-sm dark:bg-slate-900/80 mt-12 sm:mt-16">
        <div className="container mx-auto px-4 py-4 sm:py-6">
          <div className="text-center text-xs sm:text-sm text-muted-foreground">
            <p>© 2024 CKS AI - Developed By CKS-Tech</p>
            <p className="mt-1">Powered by Advanced AI Technology</p>
          </div>
        </div>
      </footer>
    </div>
  );
}