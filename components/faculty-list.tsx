"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Search, Mail, Phone, Crown, Calendar, X, Users } from "lucide-react";

interface Faculty {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  isHod: boolean | null;
  department: string | null;
}

interface FacultyListProps {
  faculty: Faculty[];
  searchQuery: string;
}

export function FacultyList({ faculty, searchQuery }: FacultyListProps) {
  const [search, setSearch] = useState(searchQuery);

  return (
    <div className="space-y-5">
      {/* Search */}
      <form
        action="/faculty"
        method="GET"
        className="flex flex-col sm:flex-row gap-3"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-kvsr-muted" />
          <input
            type="text"
            name="search"
            defaultValue={search}
            placeholder="Search faculty by name or email"
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-kvsr-soft text-sm focus:outline-none focus:ring-2 focus:ring-kvsr-gold"
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          type="submit"
          className="px-6 py-3 bg-kvsr-navy text-white text-sm font-medium rounded-xl hover:bg-kvsr-navy/90 transition-colors"
        >
          Search
        </button>
        {searchQuery && (
          <a
            href="/faculty"
            className="px-4 py-3 border border-kvsr-soft rounded-xl text-sm font-medium text-muted-foreground hover:bg-kvsr-navy/[0.03] transition-colors flex items-center justify-center gap-2"
          >
            <X className="w-4 h-4" />
            Clear
          </a>
        )}
      </form>

      {/* Count */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Users className="w-4 h-4" />
        {faculty.length} faculty member{faculty.length !== 1 ? "s" : ""}
      </div>

      {/* Grid */}
      {faculty.length === 0 ? (
        <div className="bg-white rounded-2xl border border-kvsr-soft p-12 text-center shadow-sm">
          <p className="text-muted-foreground">No faculty members found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {faculty.map((member, index) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.03 }}
            >
              <a
                href={`/faculty/${member.id}`}
                className="block p-5 rounded-2xl bg-white border border-kvsr-soft shadow-sm hover:shadow-md hover:border-kvsr-navy/10 transition-all group h-full"
              >
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-kvsr-navy/5 text-kvsr-navy font-semibold text-lg shrink-0">
                    {member.fullName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                  {member.isHod && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-kvsr-gold/15 text-kvsr-cta text-xs font-semibold">
                      <Crown className="w-3 h-3" />
                      HOD
                    </span>
                  )}
                </div>

                <h3 className="font-semibold text-kvsr-ink group-hover:text-kvsr-cta transition-colors">
                  {member.fullName}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {member.department || "Department not assigned"}
                </p>

                <div className="space-y-2 pt-4 mt-4 border-t border-kvsr-soft">
                  {member.email && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Mail className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{member.email}</span>
                    </div>
                  )}
                  {member.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="w-3.5 h-3.5 shrink-0" />
                      <span>{member.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-kvsr-cta font-medium pt-1">
                    <Calendar className="w-3.5 h-3.5" />
                    View schedule →
                  </div>
                </div>
              </a>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
