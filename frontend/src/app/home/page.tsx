"use client";

import React, { useState, useCallback, useEffect } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Navbar, NewsArticles } from "../../components/NewsList";
import type { NextPage } from "next";
import { useRouter } from "next/navigation";
import { PulseLoader } from "react-spinners";

interface Article {
  title: string;
  summary: string;
  url: string;
  image_url: string;
}

interface CachedData {
  timestamp: number;
  articles: Article[];
  source: string;
  fetch_time: number;
  blocked_domains: string[];
}

interface NewsResponse {
  articles: Article[];
  source: string;
  fetch_time: number;
  blocked_domains: string[];
}

const Home: NextPage = () => {
  const [stock, setStock] = useState<string>("");
  const [news, setNews] = useState<Article[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const router = useRouter();

  useEffect(() => {
    // Check authentication status
    const checkAuth = async () => {
      setTimeout(() => {}, 1000);
      try {
        const response = await fetch("http://localhost:5000/api/protected", {
          credentials: "include",
        });
        if (response.ok) {
          setIsAuthenticated(true);
          console.log("Authenticated");
        } else {
          // Redirect to login page if not authenticated
          setIsAuthenticated(false);
          router.push("/login");
          console.log("Not Authenticated");
        }
      } catch (error) {
        console.error("Error checking authentication:", error);
        setIsAuthenticated(false);
      }
    };

    checkAuth();
  }, [router]);

  useEffect(() => {
    if (isAuthenticated && stock) {
      // Check for cached data on component mount
      const cachedNewsString = localStorage.getItem(`stockNews_${stock}`);
      if (cachedNewsString) {
        try {
          const cachedNews: CachedData = JSON.parse(cachedNewsString);
          const now = new Date().getTime();
          const hoursSinceCached = (now - cachedNews.timestamp) / (1000 * 60 * 60);

          if (hoursSinceCached < 24) {
            setNews(cachedNews.articles);
            toast.info(`Loaded cached news for ${stock} (Fetched from ${cachedNews.source} in ${cachedNews.fetch_time.toFixed(2)} seconds)`);
            if (cachedNews.blocked_domains && cachedNews.blocked_domains.length > 0) {
              toast.warn(`Blocked domains: ${cachedNews.blocked_domains.join(', ')}`);
            }
          } else {
            localStorage.removeItem(`stockNews_${stock}`);
          }
        } catch (error) {
          console.error("Error parsing cached news:", error);
          localStorage.removeItem(`stockNews_${stock}`);
        }
      }
    }
  }, [stock, isAuthenticated]);

  const handleLogout = async () => {
    try {
      const response = await fetch("http://localhost:5000/api/logout", {
        method: "POST",
        credentials: "include",
      });
      if (response.ok) {
        setIsAuthenticated(false);
        router.push("/login");
      } else {
        throw new Error("Logout failed");
      }
    } catch (error) {
      console.error("Error during logout:", error);
      toast.error("Logout failed");
    }
  };

  const handleSearch = useCallback(
    async (searchTerm: string, numArticles: number) => {
      if (!isAuthenticated) {
        toast.error("Please log in to search for news");
        return;
      }

      setLoading(true);
      setNews([]);

      try {
        const response = await fetch(
          `http://localhost:5000/api/news?stock=${searchTerm}&num_articles=${numArticles}`,
          {
            credentials: "include",
          }
        );

        if (!response.ok) {
          if (response.status === 401) {
            router.push("/login");
            return;
          }
          if (response.status === 429) {
            toast.error("Rate limit exceeded");
            throw new Error("Rate limit exceeded");
          }
          throw new Error("Network response was not ok");
        }

        const data: NewsResponse = await response.json();
        setNews(data.articles);

        // Display toast notifications
        const source = data.source === 'cache' ? 'database cache' : 'News API';
        toast.success(`Fetched ${data.articles.length} articles in ${data.fetch_time.toFixed(2)} seconds from ${source}`);
        
        if (data.blocked_domains && data.blocked_domains.length > 0) {
          toast.warn(`Newly blocked domains: ${data.blocked_domains.join(', ')}`);
        }

        // Cache the new data
        const cacheData: CachedData = {
          timestamp: new Date().getTime(),
          articles: data.articles,
          source: data.source,
          fetch_time: data.fetch_time,
          blocked_domains: data.blocked_domains
        };
        localStorage.setItem(
          `stockNews_${searchTerm}`,
          JSON.stringify(cacheData)
        );
      } catch (error) {
        console.error("Error fetching news:", error);
        if (error instanceof Error) {
          toast.error(error.message);
        } else {
          toast.error("Failed to fetch news articles");
        }
      } finally {
        setLoading(false);
      }
    },
    [isAuthenticated, router]
  );

  if (!isAuthenticated) {
    return (
      <div className="flex justify-center items-center h-screen">
        <PulseLoader color="#2563EB" loading={true} size={15} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar
        onSearch={handleSearch}
        stock={stock}
        setStock={setStock}
        onLogout={handleLogout}
    loading={loading}
      />
      <main className="container mx-auto px-4 py-8">
        <NewsArticles news={news} loading={loading} />
      </main>
      <ToastContainer position="bottom-right" />
    </div>
  );
};

export default Home;