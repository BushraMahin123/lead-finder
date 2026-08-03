"use client";







import { useRouter } from "next/navigation";



import { useCallback, useEffect, useMemo, useRef, useState } from "react";



import { ApiError, fetchJson } from "@/lib/fetch-json";



import { notifyBillingBalanceRefresh } from "@/hooks/useBillingBalance";



import type {



  CampaignColumn,



  CampaignColumnValue,



  ContactRowMeta,



} from "@/types/campaign";



import type { EnrichContactResult, EnrichType, LeadPerson, SearchFilters } from "@/types/lead";



import AiColumnErrorIndicator from "@/components/AiColumnErrorIndicator";



import AiColumnValueCell from "@/components/AiColumnValueCell";



import {



  ContactNotesInput,



  ContactTrackingCell,



  rowBackgroundClass,



  rowLeftBorderClass,



  stickyCellBackground,



} from "@/components/ContactRowTracking";



import { IconCopy } from "@/components/icons";







interface LeadResultsProps {



  people: LeadPerson[];



  totalEntries: number;



  loading: boolean;



  showEmptyState?: boolean;



  searchFilters?: SearchFilters | null;



  campaignId?: string | null;



  onPeopleUpdate: (people: LeadPerson[]) => void;



  enableEnrichment?: boolean;



  aiColumns?: CampaignColumn[];



  columnValues?: Record<string, Record<string, CampaignColumnValue>>;



  runningColumnId?: string | null;



  onAddColumn?: () => void;



  onRunColumn?: (columnId: string, personIds: string[]) => void;



  onEditColumn?: (column: CampaignColumn) => void;



  onDeleteColumn?: (columnId: string) => void;



  onDismissColumnError?: (personId: string, columnId: string) => void;



  enableTracking?: boolean;



  contactMeta?: Record<string, ContactRowMeta>;



  onContactMetaUpdate?: (



    personId: string,



    updates: Partial<Pick<ContactRowMeta, "status" | "notes" | "rowColor" | "isDone">>,



  ) => void;



}







function displayName(person: LeadPerson): string {



  if (person.name) return person.name;



  return [person.first_name, person.last_name].filter(Boolean).join(" ") || "—";



}







function isContactDone(meta: ContactRowMeta | undefined): boolean {



  return Boolean(meta?.isDone || meta?.status === "done");



}







function displayPhone(person: LeadPerson): string {



  const phones = person.phone_numbers ?? [];



  if (phones.length === 0) return "—";



  return phones



    .map((phone) => phone.sanitized_number || phone.raw_number)



    .filter(Boolean)



    .join(", ");



}







function displayLocation(person: LeadPerson): string {



  const parts = [person.city, person.state, person.country].filter(Boolean);



  if (parts.length > 0) return parts.join(", ");



  const org = person.organization;



  if (!org) return "—";



  return [org.city, org.state, org.country].filter(Boolean).join(", ") || "—";



}







function applyEnrichment(



  people: LeadPerson[],



  results: EnrichContactResult[],



  type: EnrichType,



): LeadPerson[] {



  const byId = new Map(results.map((result) => [result.id, result]));







  return people.map((person) => {



    const update = byId.get(person.id);



    if (!update) return person;







    if (update.error) {



      // Mark as failed and store message



      if (type === "email") {



        return { 



          ...person, 



          email: "No Email Found",



          email_extraction_failed: true 



        };



      } else {



        return { 



          ...person, 



          phone_numbers: [{ raw_number: "No Phone number found" }],



          phone_extraction_failed: true 



        };



      }



    }







    // Clear failed flag if data found



    const updated = {



      ...person,



      email: update.email ?? person.email,



      email_status: update.email_status ?? person.email_status,



      phone_numbers: update.phone_numbers ?? person.phone_numbers,



    };







    if (type === "email" && update.email) {



      updated.email_extraction_failed = false;



    }



    if (type === "phone" && update.phone_numbers?.length) {



      updated.phone_extraction_failed = false;



    }







    return updated;



  });



}







const STICKY_SHADOW =



  "shadow-[4px_0_8px_-4px_rgba(15,23,42,0.08)]";







const STICKY_HEADER_CLASSES = [



  "w-36 min-w-36 sm:sticky sm:left-0 sm:z-30 sm:w-44 sm:min-w-44 bg-slate-50",



  `w-40 min-w-40 sm:sticky sm:left-44 sm:z-30 sm:w-52 sm:min-w-52 bg-slate-50 ${STICKY_SHADOW}`,



] as const;







function stickyBodyClass(



  index: 0 | 1,



  selected: boolean,



  meta?: ContactRowMeta,



): string {



  const bg = stickyCellBackground(meta, selected);



  const bases = [



    `w-36 min-w-36 sm:sticky sm:left-0 sm:z-10 sm:w-44 sm:min-w-44 ${bg}`,



    `w-40 min-w-40 sm:sticky sm:left-44 sm:z-10 sm:w-52 sm:min-w-52 ${bg} ${STICKY_SHADOW}`,



  ];



  return bases[index];



}







function isInteractiveRowTarget(target: EventTarget | null): boolean {



  if (!(target instanceof Element)) return false;



  return Boolean(



    target.closest(



      "a, button, input, select, textarea, [data-no-row-select]",



    ),



  );



}







async function copyToClipboard(text: string, fieldId: string, onCopied: (fieldId: string) => void): Promise<boolean> {



  try {



    await navigator.clipboard.writeText(text);



    onCopied(fieldId);



    setTimeout(() => onCopied(null), 2000);



    return true;



  } catch (err) {



    console.error("Failed to copy:", err);



    return false;



  }



}







function isMobile(): boolean {
  return typeof window !== 'undefined' && window.innerWidth < 640;
}

export default function LeadResults({



  people,



  totalEntries,



  loading,



  showEmptyState = false,



  searchFilters,



  campaignId,



  onPeopleUpdate,



  enableEnrichment = true,



  aiColumns = [],



  columnValues = {},



  runningColumnId = null,



  onAddColumn,



  onRunColumn,



  onEditColumn,



  onDeleteColumn,



  onDismissColumnError,



  enableTracking = false,



  contactMeta = {},



  onContactMetaUpdate,



}: LeadResultsProps) {



  const router = useRouter();



  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());



  const [enrichingType, setEnrichingType] = useState<EnrichType | null>(null);



  const [enrichError, setEnrichError] = useState<string | null>(null);



  const [enrichNotice, setEnrichNotice] = useState<string | null>(null);

  const [copiedField, setCopiedField] = useState<string | null>(null);

  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());

  const [searchQuery, setSearchQuery] = useState<string>("");

  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const tableScrollRef = useRef<HTMLDivElement>(null);


  const horizontalScrollRef = useRef<HTMLDivElement>(null);



  const [horizontalScroll, setHorizontalScroll] = useState({



    visible: false,



    contentWidth: 0,



    tableMaxHeight: 320,



  });







  const updateHorizontalScroll = useCallback(() => {



    const scroller = tableScrollRef.current;



    if (!scroller) return;







    const hasHorizontalOverflow = scroller.scrollWidth > scroller.clientWidth + 1;



    const tableTop = scroller.getBoundingClientRect().top;



    const scrollbarSpace = hasHorizontalOverflow ? 24 : 8;



    const next = {



      visible: hasHorizontalOverflow,



      contentWidth: scroller.scrollWidth,



      tableMaxHeight: Math.max(



        180,



        Math.floor(window.innerHeight - tableTop - scrollbarSpace),



      ),



    };







    setHorizontalScroll((current) => {



      if (



        current.visible === next.visible &&



        current.contentWidth === next.contentWidth &&



        current.tableMaxHeight === next.tableMaxHeight



      ) {



        return current;



      }



      return next;



    });



  }, []);







  const peopleIds = useMemo(
    () => people.map((person) => person.id).join(","),
    [people],
  );

  const filteredPeople = useMemo(() => {
    if (!searchQuery.trim()) return people;
    
    const query = searchQuery.toLowerCase();
    return people.filter((person) => {
      const name = displayName(person).toLowerCase();
      const title = (person.title ?? "").toLowerCase();
      const company = (person.organization?.name ?? "").toLowerCase();
      const email = (person.email ?? "").toLowerCase();
      const location = displayLocation(person).toLowerCase();
      const phones = person.phone_numbers ?? [];
      const phoneNumbers = phones
        .map((phone) => phone.sanitized_number || phone.raw_number)
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      
      return (
        name.includes(query) ||
        title.includes(query) ||
        company.includes(query) ||
        email.includes(query) ||
        location.includes(query) ||
        phoneNumbers.includes(query)
      );
    });
  }, [people, searchQuery]);




  useEffect(() => {
    setSelectedIds(new Set());
    setEnrichError(null);
    setEnrichNotice(null);
    setCopiedField(null);
    setProcessingIds(new Set());
    setSearchQuery("");
  }, [peopleIds]);







  useEffect(() => {



    updateHorizontalScroll();







    const scroller = tableScrollRef.current;



    const observer =



      scroller && typeof ResizeObserver !== "undefined"



        ? new ResizeObserver(updateHorizontalScroll)



        : null;



    if (scroller) observer?.observe(scroller);







    window.addEventListener("resize", updateHorizontalScroll);







    return () => {



      observer?.disconnect();



      window.removeEventListener("resize", updateHorizontalScroll);



    };



  }, [people, aiColumns, updateHorizontalScroll]);







  useEffect(() => {



    if (!horizontalScroll.visible) return;



    const tableScroller = tableScrollRef.current;



    const horizontalScroller = horizontalScrollRef.current;



    if (tableScroller && horizontalScroller) {



      horizontalScroller.scrollLeft = tableScroller.scrollLeft;



    }



  }, [horizontalScroll.visible]);







  const someSelected = selectedIds.size > 0;



  const extractableSelectedPeople = useMemo(



    () =>



      people.filter(



        (person) =>



          selectedIds.has(person.id) && !isContactDone(contactMeta[person.id]),



      ),



    [people, selectedIds, contactMeta],



  );



  const extractableSelectedCount = extractableSelectedPeople.length;



  const showExtractActions =



    enableEnrichment && someSelected && extractableSelectedCount > 0;







  function toggleOne(id: string) {



    setSelectedIds((current) => {



      const next = new Set(current);



      if (next.has(id)) next.delete(id);



      else next.add(id);



      return next;



    });



  }







  function syncFromTable() {



    const tableScroller = tableScrollRef.current;



    const horizontalScroller = horizontalScrollRef.current;



    if (



      tableScroller &&



      horizontalScroller &&



      horizontalScroller.scrollLeft !== tableScroller.scrollLeft



    ) {



      horizontalScroller.scrollLeft = tableScroller.scrollLeft;



    }



  }







  function syncFromHorizontalScrollbar() {



    const tableScroller = tableScrollRef.current;



    const horizontalScroller = horizontalScrollRef.current;



    if (



      tableScroller &&



      horizontalScroller &&



      tableScroller.scrollLeft !== horizontalScroller.scrollLeft



    ) {



      tableScroller.scrollLeft = horizontalScroller.scrollLeft;



    }



  }







  async function handleExtract(type: EnrichType) {



    const selectedPeople = extractableSelectedPeople;



    if (selectedPeople.length === 0) return;







    setEnrichingType(type);



    setEnrichError(null);



    setEnrichNotice(null);



    setProcessingIds(new Set(selectedPeople.map((p) => p.id)));







    const label = type === "email" ? "email" : "phone number";



    const labelPlural = type === "email" ? "emails" : "phone numbers";







    try {



      const { response, data } = await fetchJson("/api/enrich", {



        method: "POST",



        headers: { "Content-Type": "application/json" },



        body: JSON.stringify({



          people: selectedPeople,



          filters: searchFilters ?? undefined,



          campaignId: campaignId ?? undefined,



          type,



        }),



      });







      if (!response.ok) {



        throw new Error(String(data.error ?? "Extraction failed"));



      }







      const results = (data.results ?? []) as EnrichContactResult[];



      const fromStorage = Number(data.fromStorage ?? 0);



      const enrichedCount = results.filter((result) =>



        type === "email" ? Boolean(result.email) : Boolean(result.phone_numbers?.length),



      ).length;



      const failed = results.filter((result) => result.error);



      const failedCount = Number(data.failedCount ?? failed.length);



      const freshlyExtracted = enrichedCount - fromStorage;







      onPeopleUpdate(applyEnrichment(people, results, type));



      setSelectedIds(new Set());







      // Refresh token balance immediately after successful extraction



      const tokensDebited = Number(data.tokensDebited ?? 0);



      if (tokensDebited > 0) {



        notifyBillingBalanceRefresh();



      }







      if (enrichedCount > 0) {



        if (fromStorage > 0 && freshlyExtracted > 0) {



          setEnrichNotice(



            `Loaded ${fromStorage} saved ${labelPlural} and extracted ${freshlyExtracted} new.`,



          );



        } else if (fromStorage > 0) {



          setEnrichNotice(



            `Loaded saved ${labelPlural} for ${fromStorage} contact${fromStorage === 1 ? "" : "s"} — no credits used.`,



          );



        } else {



          setEnrichNotice(



            `Extracted ${labelPlural} for ${enrichedCount} of ${selectedPeople.length} selected contact${selectedPeople.length === 1 ? "" : "s"}.`,



          );



        }



      } else {



        setEnrichError(`No ${labelPlural} were found for the selected contacts.`);



      }







      if (failed.length > 0 && enrichedCount > 0) {



        setEnrichNotice(



          `Extracted ${labelPlural} for ${enrichedCount} of ${selectedPeople.length}. ${failedCount} could not be found.`,



        );



      } else if (failed.length > 0 && enrichedCount === 0) {



        // Show specific error message if all failures have the same error



        const errorMessages = new Set(failed.map((f) => f.error));



        if (errorMessages.size === 1) {



          const specificError = Array.from(errorMessages)[0];



          setEnrichError(specificError || `Failed to extract ${labelPlural} for ${failedCount} of ${selectedPeople.length} contact${selectedPeople.length === 1 ? "" : "s"}. Please try again.`);



        } else {



          setEnrichError(



            `Failed to extract ${labelPlural} for ${failedCount} of ${selectedPeople.length} contact${selectedPeople.length === 1 ? "" : "s"}. Please try again.`,



          );



        }



      }



    } catch (err) {



      if (err instanceof ApiError && err.status === 401) {



        router.push("/login?next=/results");



        setEnrichError("Your session expired. Redirecting to sign in…");



        return;



      }



      if (err instanceof ApiError && err.status === 402) {



        setEnrichError(



          "Not enough tokens for this extraction. Visit Pricing to buy more tokens.",



        );



        return;



      }



      setEnrichError(



        err instanceof Error



          ? err.message



          : `Could not extract ${label} details`,



      );



    } finally {



      setEnrichingType(null);



      setProcessingIds(new Set());



    }



  }







  if (loading) {



    return (



      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm">



        Fetching leads…



      </div>



    );



  }







  if (people.length === 0) {



    return (



      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500 shadow-sm">



        {showEmptyState



          ? "No search yet. Use the filters on the left and click Find leads."



          : "No leads matched these filters. Try broadening your criteria."}



      </div>



    );



  }







  return (



    <div className={`overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${isExpanded ? "fixed inset-0 z-50 rounded-none border-0" : ""}`}>



      <div className="border-b border-slate-100 px-4 py-4 sm:px-5">



        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>

            <h2 className="text-lg font-semibold text-slate-900">Results</h2>

            <p className="text-sm text-slate-500">
              Showing {filteredPeople.length} of {totalEntries.toLocaleString()} matches
              {searchQuery && (
                <span className="text-slate-700">
                  {" "}(filtered from {people.length})
                </span>
              )}
              {someSelected && (
                <span className="text-slate-700">
                  {" "}
                  · {selectedIds.size} selected
                </span>
              )}
            </p>

          </div>

          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="rounded-lg border border-slate-300 bg-white p-2 text-slate-700 transition hover:bg-slate-50 hover:border-slate-400 sm:min-h-[44px] sm:min-w-[44px]"
              title={isExpanded ? "Compress table" : "Expand table"}
            >
              {isExpanded ? (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h6v6"/>
                  <path d="M9 21H3v-6"/>
                  <path d="M21 3l-7 7"/>
                  <path d="M3 21l7-7"/>
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v6h-6"/>
                  <path d="M3 9v-6h6"/>
                  <path d="M21 3l-7 7"/>
                  <path d="M3 21l7-7"/>
                </svg>
              )}
            </button>

          {enableEnrichment && someSelected && (



            <div className="flex flex-wrap items-center gap-2">



              {aiColumns.map((column) => (



                <button



                  key={column.id}



                  type="button"



                  onClick={() =>



                    onRunColumn?.(column.id, [...selectedIds])



                  }



                  disabled={enrichingType !== null || runningColumnId !== null}



                  className="rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-sm font-semibold text-violet-800 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-[44px]"



                >



                  {runningColumnId === column.id



                    ? `Running ${column.name}…`



                    : `Run ${column.name} (${selectedIds.size})`}



                </button>



              ))}



              {showExtractActions && (



                <>



                  <button



                    type="button"



                    onClick={() => handleExtract("email")}



                    disabled={enrichingType !== null || runningColumnId !== null}



                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-[44px]"



                  >



                    {enrichingType === "email"



                      ? "Extracting emails…"



                      : `Extract emails (${extractableSelectedCount})`}



                  </button>



                  <button



                    type="button"



                    onClick={() => handleExtract("phone")}



                    disabled={enrichingType !== null || runningColumnId !== null}



                    className="rounded-lg border border-indigo-200 bg-white px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-[44px]"



                  >



                    {enrichingType === "phone"



                      ? "Extracting phones…"



                      : `Extract phone numbers (${extractableSelectedCount})`}



                  </button>



                </>



              )}



            </div>



          )}



          </div>

        </div>







        {enrichError && (



          <div className="mt-3 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">



            <p>{enrichError}</p>



            <button



              type="button"



              onClick={() => setEnrichError(null)}



              className="ml-2 text-red-400 hover:text-red-600 transition-colors"



              title="Dismiss"



            >



              ×



            </button>



          </div>



        )}







        {enrichNotice && (



          <div className="mt-3 flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">



            <p>{enrichNotice}</p>



            <button



              type="button"



              onClick={() => setEnrichNotice(null)}



              className="ml-2 text-emerald-400 hover:text-emerald-600 transition-colors"



              title="Dismiss"



            >



              ×



            </button>



          </div>



        )}



      </div>







      <div



        ref={tableScrollRef}



        tabIndex={0}



        aria-label="Contacts table"



        onScroll={syncFromTable}



        className="table-scroll-vertical-only overflow-y-auto overflow-x-auto sm:overflow-x-hidden overscroll-contain"




        style={{ maxHeight: horizontalScroll.tableMaxHeight}}




        id="table-scroll-container"




      >



        <table className="min-w-full border-separate border-spacing-0 text-left text-sm">



          <colgroup>



            <col className="w-36 sm:w-44" />



            <col className="w-40 sm:w-52" />



          </colgroup>



          <thead className="sticky top-0 z-20 bg-slate-50 text-slate-600 shadow-sm">



            <tr>



              <th className={`border border-slate-200 px-3 py-2 font-medium bg-slate-50 ${STICKY_HEADER_CLASSES[0]}`}>



                Name



              </th>



              <th className={`border border-slate-200 px-3 py-2 font-medium bg-slate-50 ${STICKY_HEADER_CLASSES[1]}`}>



                Title



              </th>



              {enableTracking && (



                <>



                  <th className="min-w-[14rem] border border-slate-200 bg-slate-50/90 px-3 py-2 font-medium text-slate-700 sticky top-0">



                    Follow-up



                  </th>



                  <th className="min-w-[12rem] border border-slate-200 bg-slate-50/90 px-3 py-2 font-medium text-slate-700 sticky top-0">



                    Notes



                  </th>



                </>



              )}



              <th className="border border-slate-200 px-3 py-2 font-medium sticky top-0 bg-slate-50">Company</th>



              <th className="border border-slate-200 px-3 py-2 font-medium sticky top-0 bg-slate-50">Email</th>



              <th className="border border-slate-200 px-3 py-2 font-medium sticky top-0 bg-slate-50">Phone</th>



              <th className="border border-slate-200 px-3 py-2 font-medium sticky top-0 bg-slate-50">Location</th>



              <th className="border border-slate-200 px-3 py-2 font-medium sticky top-0 bg-slate-50">LinkedIn</th>



              {aiColumns.map((column) => (



                <th



                  key={column.id}



                  className="min-w-[10rem] border border-slate-200 px-3 py-2 font-medium text-violet-800 sticky top-0 bg-slate-50"



                >



                  <div className="flex items-center gap-1.5">



                    <span className="truncate">{column.name}</span>



                    <span className="rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-700">



                      AI



                    </span>



                    {onEditColumn && (



                      <button



                        type="button"



                        onClick={() => onEditColumn(column)}



                        className="ml-auto text-xs font-medium text-slate-400 hover:text-slate-600 sm:p-1 sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center"



                        title="Edit column"



                      >



                        Edit



                      </button>



                    )}



                    {onDeleteColumn && (



                      <button



                        type="button"



                        onClick={() => onDeleteColumn(column.id)}



                        className="text-xs font-medium text-slate-400 hover:text-red-600 sm:p-1 sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center"



                        title="Delete column"



                      >



                        ×



                      </button>



                    )}



                  </div>



                </th>



              ))}



              {onAddColumn && (



                <th className="border border-slate-200 px-3 py-2 font-medium sticky top-0 bg-slate-50">



                  <button



                    type="button"



                    onClick={onAddColumn}



                    className="inline-flex items-center gap-1 rounded-lg border border-dashed border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"



                  >



                    + Add AI column



                  </button>



                </th>



              )}



            </tr>



          </thead>



          <tbody className="divide-y divide-slate-100">



            {filteredPeople.map((person) => {



              const selected = selectedIds.has(person.id);



              const meta = contactMeta[person.id];



              const isDone = isContactDone(meta);







              return (



                <tr



                  key={person.id}



                  onClick={(event) => {



                    if (!enableEnrichment || isInteractiveRowTarget(event.target)) {



                      return;



                    }



                    toggleOne(person.id);



                  }}



                  className={`border-l-[3px] ${rowLeftBorderClass(meta)} ${rowBackgroundClass(meta, selected)} ${enableEnrichment ? "cursor-pointer" : ""



                    }`}



                >



                  <td



                    className={`max-w-44 truncate border border-slate-200 px-3 py-2 font-medium bg-white ${stickyBodyClass(0, selected, meta)} ${isDone ? "text-slate-400 line-through decoration-slate-300" : "text-slate-900"



                      }`}



                  >



                    {displayName(person)}



                  </td>



                  <td



                    className={`max-w-52 truncate border border-slate-200 px-3 py-2 bg-white ${stickyBodyClass(1, selected, meta)} ${isDone ? "text-slate-400 line-through decoration-slate-300" : "text-slate-700"



                      }`}



                  >



                    {person.title ?? "—"}



                  </td>



                  {enableTracking && (



                    <>



                      <td className="border border-slate-200 px-3 py-2">



                        <ContactTrackingCell



                          personLabel={displayName(person)}



                          meta={meta}



                          onMetaUpdate={(updates) => {



                            if (updates.isDone) {



                              setSelectedIds((current) => {



                                if (!current.has(person.id)) return current;



                                const next = new Set(current);



                                next.delete(person.id);



                                return next;



                              });



                            }



                            onContactMetaUpdate?.(person.id, updates);



                          }}



                        />



                      </td>



                      <td className="border border-slate-200 px-3 py-2">



                        <ContactNotesInput



                          value={meta?.notes ?? ""}



                          onChange={(notes) =>



                            onContactMetaUpdate?.(person.id, { notes })



                          }



                        />



                      </td>



                    </>



                  )}



                  <td className={`border border-slate-200 px-3 py-2 ${isDone ? "opacity-60" : ""}`}>



                    {person.organization?.website_url ? (



                      <a



                        href={person.organization.website_url}



                        target="_blank"



                        rel="noopener noreferrer"



                        className="text-indigo-600 hover:underline"



                        data-no-row-select



                      >



                        <div>{person.organization?.name ?? "—"}</div>



                        {person.organization?.primary_domain && (



                          <div className="text-xs text-slate-500">



                            {person.organization.primary_domain}



                          </div>



                        )}



                      </a>



                    ) : (



                      <>



                        <div>{person.organization?.name ?? "—"}</div>



                        {person.organization?.primary_domain && (



                          <div className="text-xs text-slate-500">



                            {person.organization.primary_domain}



                          </div>



                        )}



                      </>



                    )}



                  </td>



                  <td className={`border border-slate-200 px-3 py-2 ${isDone ? "opacity-60" : ""}`}>



                    {processingIds.has(person.id) && enrichingType === "email" ? (



                      <div className="flex items-center justify-center">



                        <img src="/lead.png" alt="Loading" className="h-5 w-5 animate-pulse" />



                      </div>



                    ) : person.email && person.email !== "No Email Found" ? (



                      <div className="flex items-center gap-2">



                        <a



                          href={`mailto:${person.email}`}



                          className="text-indigo-600 hover:underline"



                        >



                          {person.email}



                        </a>



                        <button



                          type="button"



                          onClick={(e) => {



                            e.stopPropagation();



                            if (person.email) {



                              copyToClipboard(person.email, `${person.id}-email`, setCopiedField);



                            }



                          }}



                          className="text-slate-400 hover:text-slate-600 transition-colors sm:p-1 sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center"



                          title="Copy email"



                          data-no-row-select



                        >



                          <IconCopy className="h-4 w-4 sm:h-5 sm:w-5" />



                        </button>



                        {copiedField === `${person.id}-email` && (



                          <span className="text-xs text-emerald-600 font-medium">Copied!</span>



                        )}



                        {person.email_status && (



                          <div className="mt-1">



                            <span className="inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-emerald-700 ring-1 ring-emerald-200/80">



                              {person.email_status}



                            </span>



                          </div>



                        )}



                      </div>



                    ) : person.email_extraction_failed ? (



                      <span className="text-xs text-red-600">No Email Found</span>



                    ) : (



                      <span className="text-slate-400">—</span>



                    )}



                  </td>



                  <td className={`border border-slate-200 px-3 py-2 text-slate-700 whitespace-nowrap ${isDone ? "opacity-60" : ""}`}>



                    {processingIds.has(person.id) && enrichingType === "phone" ? (



                      <div className="flex items-center justify-center">



                        <img src="/lead.png" alt="Loading" className="h-5 w-5 animate-pulse" />



                      </div>



                    ) : person.phone_numbers && person.phone_numbers.length > 0 && person.phone_numbers[0].raw_number !== "No Phone number found" ? (



                      <div className="flex items-center gap-2">



                        <span>{displayPhone(person)}</span>



                        <button



                          type="button"



                          onClick={(e) => {



                            e.stopPropagation();



                            const phone = person.phone_numbers[0];



                            const phoneToCopy = phone.sanitized_number || phone.raw_number;



                            if (phoneToCopy) {



                              copyToClipboard(phoneToCopy, `${person.id}-phone`, setCopiedField);



                            }



                          }}



                          className="text-slate-400 hover:text-slate-600 transition-colors sm:p-1 sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center"



                          title="Copy phone number"



                          data-no-row-select



                        >



                          <IconCopy className="h-4 w-4 sm:h-5 sm:w-5" />



                        </button>



                        {copiedField === `${person.id}-phone` && (



                          <span className="text-xs text-emerald-600 font-medium">Copied!</span>



                        )}



                      </div>



                    ) : person.phone_extraction_failed ? (



                      <span className="text-xs text-red-600">No Phone Number Found </span>



                    ) : (



                      <span className="text-slate-400">—</span>



                    )}



                  </td>



                  <td className={`border border-slate-200 px-3 py-2 text-slate-700 whitespace-nowrap ${isDone ? "opacity-60" : ""}`}>{displayLocation(person)}</td>



                  <td className={`border border-slate-200 px-3 py-2 ${isDone ? "opacity-60" : ""}`}>



                    {person.linkedin_url ? (



                      <a



                        href={person.linkedin_url}



                        target="_blank"



                        rel="noopener noreferrer"



                        className="text-indigo-600 hover:underline"



                      >



                        Profile



                      </a>



                    ) : (



                      "—"



                    )}



                  </td>



                  {aiColumns.map((column) => {



                    const cell = columnValues[person.id]?.[column.id];



                    const isRunning =



                      cell?.status === "running" && cell.columnId === column.id;







                    return (



                      <td



                        key={column.id}



                        className="max-w-xs border border-slate-200 px-3 py-2 text-slate-700"



                      >



                        {isRunning ? (



                          <div className="flex items-center justify-center">



                            <img src="/lead.png" alt="Loading" className="h-5 w-5 animate-pulse" />



                          </div>



                        ) : cell?.status === "error" ? (



                          <div className="flex items-start gap-2">



                            <AiColumnErrorIndicator



                              message={cell.error ?? "AI enrichment failed"}



                            />



                            <button



                              type="button"



                              onClick={(e) => {



                                e.stopPropagation();



                                onDismissColumnError?.(person.id, column.id);



                              }}



                              className="text-slate-400 hover:text-slate-600 transition-colors sm:p-1 sm:min-h-[36px] sm:min-w-[36px] flex items-center justify-center"



                              title="Dismiss"



                              data-no-row-select



                            >



                              ×



                            </button>



                          </div>



                        ) : cell?.value ? (



                          <AiColumnValueCell value={cell.value} />



                        ) : (



                          <span className="text-xs text-slate-400">—</span>



                        )}



                      </td>



                    );



                  })}



                  {onAddColumn && <td className="px-3 py-3" />}



                </tr>



              );



            })}



          </tbody>



        </table>



      </div>



      {horizontalScroll.visible && (



        <div



          ref={horizontalScrollRef}



          aria-label="Scroll table horizontally"



          tabIndex={0}



          onScroll={syncFromHorizontalScrollbar}



          className="h-5 sm:h-5 overflow-x-auto overflow-y-hidden border-t border-slate-200 bg-slate-50 hidden sm:block"



        >



          <div



            className="h-px"



            style={{ width: horizontalScroll.contentWidth }}



          />



        </div>



      )}



    </div>



  );



}



