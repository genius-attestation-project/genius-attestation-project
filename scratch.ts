import { Country, State } from "country-state-city";
const allCountries = Country.getAllCountries();
console.log(allCountries.length);
console.log(allCountries[0]);
console.log(State.getStatesOfCountry("IN").length);
