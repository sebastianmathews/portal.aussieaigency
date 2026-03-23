"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Play, Pause, Search, Mic2, Volume2 } from "lucide-react";

interface Voice {
  voice_id: string;
  name: string;
  category: string;
  labels: Record<string, string>;
  preview_url: string;
}

interface VoiceSelectorProps {
  value: string;
  onChange: (voiceId: string) => void;
}

export function VoiceSelector({ value, onChange }: VoiceSelectorProps) {
  const [voices, setVoices] = useState<Voice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [genderFilter, setGenderFilter] = useState<string>("all");
  const [ageFilter, setAgeFilter] = useState<string>("all");
  const [accentFilter, setAccentFilter] = useState<string>("all");
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    async function fetchVoices() {
      try {
        const res = await fetch("/api/elevenlabs/voices");
        if (!res.ok) throw new Error("Failed to fetch voices");
        const data = await res.json();
        setVoices(data.voices ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load voices");
      } finally {
        setLoading(false);
      }
    }
    fetchVoices();
  }, []);

  const handlePlay = (voice: Voice) => {
    if (playingId === voice.voice_id) {
      audioRef.current?.pause();
      setPlayingId(null);
      return;
    }

    if (audioRef.current) {
      audioRef.current.pause();
    }

    const audio = new Audio(voice.preview_url);
    audioRef.current = audio;
    setPlayingId(voice.voice_id);

    audio.play().catch(() => setPlayingId(null));
    audio.onended = () => setPlayingId(null);
    audio.onerror = () => setPlayingId(null);
  };

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  // Extract unique filter values from voices
  const accents = Array.from(
    new Set(voices.map((v) => v.labels?.accent).filter(Boolean))
  ).sort((a, b) => {
    // Put Australian first
    if (a.toLowerCase() === "australian") return -1;
    if (b.toLowerCase() === "australian") return 1;
    return a.localeCompare(b);
  });

  const genders = Array.from(
    new Set(voices.map((v) => v.labels?.gender).filter(Boolean))
  ).sort();

  const ages = Array.from(
    new Set(voices.map((v) => v.labels?.age).filter(Boolean))
  ).sort();

  const categories = Array.from(
    new Set(voices.map((v) => v.category).filter(Boolean))
  ).sort();

  const filteredVoices = voices.filter((voice) => {
    const matchesSearch = voice.name
      .toLowerCase()
      .includes(search.toLowerCase());
    const matchesCategory =
      categoryFilter === "all" || voice.category === categoryFilter;
    const matchesGender =
      genderFilter === "all" || voice.labels?.gender === genderFilter;
    const matchesAge =
      ageFilter === "all" || voice.labels?.age === ageFilter;
    const matchesAccent =
      accentFilter === "all" ||
      voice.labels?.accent?.toLowerCase() === accentFilter.toLowerCase();
    return (
      matchesSearch &&
      matchesCategory &&
      matchesGender &&
      matchesAge &&
      matchesAccent
    );
  });

  // Sort: Australian voices first
  const sortedVoices = [...filteredVoices].sort((a, b) => {
    const aIsAussie = a.labels?.accent?.toLowerCase() === "australian" ? 0 : 1;
    const bIsAussie = b.labels?.accent?.toLowerCase() === "australian" ? 0 : 1;
    if (aIsAussie !== bIsAussie) return aIsAussie - bIsAussie;
    return a.name.localeCompare(b.name);
  });

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-200 py-8 text-center">
        <Volume2 className="h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => {
            setLoading(true);
            setError(null);
            fetch("/api/elevenlabs/voices")
              .then((r) => r.json())
              .then((d) => setVoices(d.voices ?? []))
              .catch((e) => setError(e.message))
              .finally(() => setLoading(false));
          }}
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search voices..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap gap-2">
        <Select value={accentFilter} onValueChange={setAccentFilter}>
          <SelectTrigger className="w-[160px] h-9 text-sm">
            <SelectValue placeholder="Accent" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Accents</SelectItem>
            {accents.map((accent) => (
              <SelectItem key={accent} value={accent}>
                {accent.charAt(0).toUpperCase() + accent.slice(1)}
                {accent.toLowerCase() === "australian" ? " ★" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={genderFilter} onValueChange={setGenderFilter}>
          <SelectTrigger className="w-[130px] h-9 text-sm">
            <SelectValue placeholder="Gender" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Genders</SelectItem>
            {genders.map((gender) => (
              <SelectItem key={gender} value={gender}>
                {gender.charAt(0).toUpperCase() + gender.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={ageFilter} onValueChange={setAgeFilter}>
          <SelectTrigger className="w-[130px] h-9 text-sm">
            <SelectValue placeholder="Age" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Ages</SelectItem>
            {ages.map((age) => (
              <SelectItem key={age} value={age}>
                {age.charAt(0).toUpperCase() + age.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[140px] h-9 text-sm">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(accentFilter !== "all" ||
          genderFilter !== "all" ||
          ageFilter !== "all" ||
          categoryFilter !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-xs text-muted-foreground"
            onClick={() => {
              setAccentFilter("all");
              setGenderFilter("all");
              setAgeFilter("all");
              setCategoryFilter("all");
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Results count */}
      <div className="text-xs text-muted-foreground">
        {sortedVoices.length} voice{sortedVoices.length !== 1 ? "s" : ""} found
        {accentFilter === "all" && (
          <span>
            {" "}
            &middot;{" "}
            <button
              type="button"
              className="text-[#F5A623] hover:underline font-medium"
              onClick={() => setAccentFilter("australian")}
            >
              Show Australian only
            </button>
          </span>
        )}
      </div>

      {/* Voices grid */}
      {sortedVoices.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">
          No voices found matching your filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[400px] overflow-y-auto pr-1">
          {sortedVoices.map((voice) => {
            const isSelected = value === voice.voice_id;
            const isPlaying = playingId === voice.voice_id;
            const isAussie =
              voice.labels?.accent?.toLowerCase() === "australian";

            return (
              <button
                key={voice.voice_id}
                type="button"
                onClick={() => onChange(voice.voice_id)}
                className={`relative flex items-center gap-3 rounded-lg border-2 p-3 text-left transition-all hover:shadow-sm ${
                  isSelected
                    ? "border-[#F5A623] bg-[#F5A623]/5 shadow-sm"
                    : isAussie
                      ? "border-[#F5A623]/30 bg-[#F5A623]/[0.02] hover:border-[#F5A623]/50"
                      : "border-gray-100 hover:border-gray-200 bg-white"
                }`}
              >
                {/* Voice icon */}
                <div
                  className={`shrink-0 rounded-full p-2 ${
                    isSelected
                      ? "bg-[#F5A623]/20 text-[#F5A623]"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  <Mic2 className="h-4 w-4" />
                </div>

                {/* Voice info */}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium truncate ${
                      isSelected ? "text-[#0A1628]" : "text-gray-700"
                    }`}
                  >
                    {voice.name}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                    {isAussie && (
                      <Badge className="text-[10px] px-1.5 py-0 h-4 bg-[#F5A623]/15 text-[#F5A623] border-[#F5A623]/30 hover:bg-[#F5A623]/15">
                        Australian
                      </Badge>
                    )}
                    {voice.labels?.gender && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0 h-4"
                      >
                        {voice.labels.gender}
                      </Badge>
                    )}
                    {voice.labels?.age && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0 h-4"
                      >
                        {voice.labels.age}
                      </Badge>
                    )}
                    {voice.labels?.accent && !isAussie && (
                      <span className="text-[10px] text-muted-foreground">
                        {voice.labels.accent}
                      </span>
                    )}
                  </div>
                </div>

                {/* Play button */}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlay(voice);
                  }}
                >
                  {isPlaying ? (
                    <Pause className="h-3.5 w-3.5" />
                  ) : (
                    <Play className="h-3.5 w-3.5" />
                  )}
                </Button>

                {/* Selected indicator */}
                {isSelected && (
                  <div className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#F5A623]" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Selected voice info */}
      {value && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground border-t pt-3">
          <Volume2 className="h-4 w-4" />
          <span>
            Selected:{" "}
            <span className="font-medium text-[#0A1628]">
              {voices.find((v) => v.voice_id === value)?.name ?? value}
            </span>
          </span>
        </div>
      )}
    </div>
  );
}
