import express from "express";
import UserController from "../controllers/user.js";
import CountryController from "../controllers/country.js";
import ProvinceController from "../controllers/province.js";
import CityController from "../controllers/city.js";
import AttractionController from "../controllers/attraction.js";
import PackageController from "../controllers/package.js";
import BookingController from "../controllers/booking.js";
import ReviewController from "../controllers/review.js";
import { auth } from "../middleware/auth.js";

const router = express.Router();

// Useer routes 
const user = "/user";

router.get(`${user}/selAll`, auth, UserController.SelectAll);
router.get(`${user}/selOne/:userID`, auth, UserController.SelectOne); // userID จะเป็น uuid
router.post(`${user}/login`, UserController.Login);
router.post(`${user}/register`, UserController.Register);
router.put(`${user}/refresh`, UserController.RefreshToken);
router.put(`${user}/update/:userID`, auth, UserController.updateProfile); // userID จะเป็น uuid
router.delete(`${user}/delete/:userID`, auth, UserController.deleteUser); // userID จะเป็น uuid

// Country routes 
const country = "/country";

router.post(`${country}/add`, auth, CountryController.Create);
router.get(`${country}/selAll`, auth, CountryController.SelectAll);
router.get(`${country}/selOne/:countryID`, auth, CountryController.SelectOne);
router.get(`${country}/iso/:iso`, auth, CountryController.SelectByISO);
router.get(`${country}/search`, auth, CountryController.Search);
router.put(`${country}/update/:countryID`, auth, CountryController.Update);
router.delete(`${country}/delete/:countryID`, auth, CountryController.Delete);

// Province routes 
const province = "/province";

router.post(`${province}/add`, auth, ProvinceController.Create);
router.get(`${province}/selAll`, auth, ProvinceController.SelectAll);
router.get(`${province}/selOne/:provinceID`, auth, ProvinceController.SelectOne);
router.get(`${province}/country/:countryID`, auth, ProvinceController.SelectByCountry);
router.get(`${province}/search`, auth, ProvinceController.Search);
router.put(`${province}/update/:provinceID`, auth, ProvinceController.Update);
router.delete(`${province}/delete/:provinceID`, auth, ProvinceController.Delete);

// City routes 
const city = "/city";

router.post(`${city}/add`, auth, CityController.Create);
router.get(`${city}/selAll`, auth, CityController.SelectAll);
router.get(`${city}/selOne/:cityID`, auth, CityController.SelectOne);
router.get(`${city}/province/:provinceID`, auth, CityController.SelectByProvince);
router.get(`${city}/country/:countryID`, auth, CityController.SelectByCountry);
router.get(`${city}/nearby`, auth, CityController.FindNearby);
router.get(`${city}/search`, auth, CityController.Search);
router.put(`${city}/update/:cityID`, auth, CityController.Update);
router.delete(`${city}/delete/:cityID`, auth, CityController.Delete);


// Attraction routes 
const attraction = "/attraction";

router.post(`${attraction}/add`, auth, AttractionController.Create);
router.get(`${attraction}/selAll`, auth, AttractionController.SelectAll);
router.get(`${attraction}/selOne/:attractionID`, auth, AttractionController.SelectOne);
router.get(`${attraction}/city/:cityID`, auth, AttractionController.SelectByCity);
router.get(`${attraction}/province/:provinceID`, auth, AttractionController.SelectByProvince);
router.get(`${attraction}/country/:countryID`, auth, AttractionController.SelectByCountry);
router.get(`${attraction}/nearby`, auth, AttractionController.FindNearby);
router.get(`${attraction}/search`, auth, AttractionController.Search);
router.put(`${attraction}/update/:attractionID`, auth, AttractionController.Update);
router.put(`${attraction}/rating/:attractionID`, auth, AttractionController.UpdateRating);
router.delete(`${attraction}/delete/:attractionID`, auth, AttractionController.Delete);


//Package route
const pkg = "/package";

router.post(`${pkg}/add`, auth, PackageController.Create);
router.get(`${pkg}/selAll`, auth, PackageController.SelectAll);
router.get(`${pkg}/selOne/:packageID`, auth, PackageController.SelectOne);
router.get(`${pkg}/search`, auth, PackageController.Search);
router.put(`${pkg}/update/:packageID`, auth, PackageController.Update);
router.delete(`${pkg}/delete/:packageID`, auth, PackageController.Delete);
router.get(`${pkg}/mostPopular`, auth, PackageController.MostPopular);
router.get(`${pkg}/leastPopular`, auth, PackageController.LeastPopular);
router.get(`${pkg}/active`, auth, PackageController.ActivePackages);
router.get(`${pkg}/country/:countryID`, auth, PackageController.PackagesByCountry);

// Booking Routes
const booking = "/booking";

router.post(`${booking}/add`, auth, BookingController.Create);
router.get(`${booking}/selAll`, auth, BookingController.SelectAll);
router.get(`${booking}/selOne/:bookingID`, auth, BookingController.SelectOne);
router.get(`${booking}/user/:userID`, auth, BookingController.SelectByUser);
router.get(`${booking}/bookingsummary`, auth, BookingController.GetBookingSummary);
router.put(`${booking}/update/:bookingID`, auth, BookingController.Update);
router.delete(`${booking}/delete/:bookingID`, auth, BookingController.Delete);

// Review Routes
const review = "/review";

router.post(`${review}/add`, auth, ReviewController.Create);
router.get(`${review}/selAll`, auth, ReviewController.SelectAll);
router.get(`${review}/selOne/:reviewID`, auth, ReviewController.SelectOne);
router.get(`${review}/user/:userID`, auth, ReviewController.SelectByUser);
router.put(`${review}/update/:reviewID`, auth, ReviewController.Update);
router.delete(`${review}/delete/:reviewID`, auth, ReviewController.Delete);
router.get(`${review}/rating`, auth, ReviewController.GetAverageRating);

export default router;