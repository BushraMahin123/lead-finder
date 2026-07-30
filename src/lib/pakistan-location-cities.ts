import type { LocationRegion, LocationState } from "@/lib/location-regions-types";

function cities(...names: string[]): LocationState["cities"] {
  return names.map((name) => ({ value: name, label: name }));
}

/**
 * Names shared with another country (India's Punjab, Jordan's Karak) must carry the
 * country so selecting one does not also match the other's people.
 */
const PUNJAB = { value: "Punjab, Pakistan", label: "Punjab" };
const KARAK = { value: "Karak, Pakistan", label: "Karak" };

/**
 * Pakistan provinces/territories with major cities, in display order.
 * Overlay on generated location data so `generate:filters` does not wipe cities.
 */
export const PAKISTAN_LOCATION_REGION: LocationRegion = {
  value: "Pakistan",
  label: "Pakistan",
  states: [
    {
      ...PUNJAB,
      cities: cities(
        "Lahore",
        "Rawalpindi",
        "Faisalabad",
        "Gujranwala",
        "Multan",
        "Sialkot",
        "Bahawalpur",
        "Sargodha",
        "Sheikhupura",
        "Gujrat",
        "Jhelum",
        "Attock",
        "Sahiwal",
        "Okara",
        "Kasur",
        "Vehari",
        "Rahim Yar Khan",
        "Dera Ghazi Khan",
        "Muzaffargarh",
        "Khanewal",
        "Mianwali",
        "Bhakkar",
        "Khushab",
        "Chiniot",
        "Jhang",
        "Toba Tek Singh",
        "Hafizabad",
        "Mandi Bahauddin",
        "Narowal",
        "Pakpattan",
        "Lodhran",
        "Bahawalnagar",
        "Rajanpur",
        "Layyah",
        "Chakwal",
        "Murree",
        "Taxila",
        "Wazirabad",
        "Kamoke",
        "Burewala",
      ),
    },
    {
      value: "Sindh",
      label: "Sindh",
      cities: [
        ...cities(
          "Karachi",
          "Hyderabad",
          "Sukkur",
          "Larkana",
          "Mirpur Khas",
        ),
        {
          value: "Nawabshah",
          label: "Nawabshah (Shaheed Benazirabad)",
        },
        ...cities(
          "Jacobabad",
          "Shikarpur",
          "Khairpur",
          "Ghotki",
          "Thatta",
          "Badin",
          "Dadu",
          "Jamshoro",
          "Kotri",
          "Tando Allahyar",
          "Tando Muhammad Khan",
          "Sanghar",
          "Umerkot",
          "Kandhkot",
          "Kashmore",
          "Matiari",
          "Sehwan",
          "Shahdadkot",
          "Rohri",
        ),
      ],
    },
    {
      value: "Khyber Pakhtunkhwa",
      label: "Khyber Pakhtunkhwa (KPK)",
      cities: [
        ...cities(
          "Peshawar",
          "Mardan",
          "Abbottabad",
          "Mingora",
          "Swat",
          "Nowshera",
          "Charsadda",
          "Kohat",
          "Dera Ismail Khan",
          "Bannu",
          "Haripur",
          "Mansehra",
          "Swabi",
        ),
        KARAK,
        ...cities(
          "Hangu",
          "Timergara",
          "Batkhela",
          "Lakki Marwat",
          "Tank",
          "Chitral",
          "Dir",
          "Landi Kotal",
        ),
      ],
    },
    {
      value: "Balochistan",
      label: "Balochistan",
      cities: cities(
        "Quetta",
        "Gwadar",
        "Turbat",
        "Khuzdar",
        "Sibi",
        "Zhob",
        "Chaman",
        "Loralai",
        "Hub",
        "Pishin",
        "Dera Murad Jamali",
        "Nushki",
        "Kharan",
        "Mastung",
        "Kalat",
        "Usta Muhammad",
        "Bela",
        "Pasni",
        "Panjgur",
      ),
    },
    {
      value: "Azad Kashmir",
      label: "Azad Jammu & Kashmir (AJK)",
      cities: cities(
        "Muzaffarabad",
        "Mirpur",
        "Kotli",
        "Bagh",
        "Rawalakot",
        "Bhimber",
        "Haveli",
        "Hattian Bala",
        "Pallandri",
      ),
    },
    {
      value: "Gilgit-Baltistan",
      label: "Gilgit-Baltistan (GB)",
      cities: cities(
        "Gilgit",
        "Skardu",
        "Hunza",
        "Chilas",
        "Ghanche",
        "Ghizer",
        "Khaplu",
        "Astore",
        "Shigar",
        "Nagar",
        "Aliabad",
        "Danyore",
      ),
    },
    {
      value: "Islamabad Capital Territory",
      label: "Islamabad Capital Territory",
      cities: cities("Islamabad"),
    },
  ],
};

/** Replace generated Pakistan entry with province→city hierarchy. */
export function withPakistanCities(regions: LocationRegion[]): LocationRegion[] {
  return regions.map((region) =>
    region.value === "Pakistan" ? PAKISTAN_LOCATION_REGION : region,
  );
}
