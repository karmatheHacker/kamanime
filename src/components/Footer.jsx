import Logo from "./Logo";
import AZ from "../layouts/AZ";


const Footer = () => {
  return (
    <div className="row mx-2  mt-5">
      <div className="logo w-full flex justify-center items-center">
        <Logo />
      </div>
      <div className="my-2 h-1 border-b border-b-neutral-700 "></div>
      <div className="az-list flex my-2 items-center gap-3">
        <p className="text-primary font-bold text-sm">A-Z list </p>
        <p className="hidden sm:block text-primary font-bold text-sm">
          Searching anime order by alphabet name A to Z.
        </p>
      </div>

      <AZ />
      <div className="desclaimer mt-5 mb-2 flex flex-col justify-center items-center">
        <p className="text-sm text-center text-gray-500">
          kamanime does not store any files on our server, <br /> we only linked
          to the media which is hosted on 3rd party services.{" "}
        </p>
        <p className="mt-4 text-gray-500">© kamanime All rights reserved.</p>
        <div className="btns flex justify-center my-2 items-center gap-2">
          {/* Link removed */}
        </div>
      </div>
    </div>
  );
};

export default Footer;
