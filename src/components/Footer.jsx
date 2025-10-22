import React from "react";
import { FaDiscord } from "react-icons/fa6";
import AZ from "../layouts/AZ";

const Footer = () => {
  return (
    <div className="row mx-2 mt-5">
      {/* Removed Logo section */}
      <div className="my-2 h-1 border-b border-b-neutral-700 "></div>

      <div className="az-list flex my-2 items-center gap-3">
        <p className="text-primary font-bold text-sm">A-Z list</p>
        <p className="hidden sm:block text-primary font-bold text-sm">
          Searching anime order by alphabet name A to Z.
        </p>
      </div>

      <AZ />

      <div className="desclaimer mt-5 mb-2 flex flex-col justify-center items-center">
        <p className="text-sm text-center text-gray-500">
          Kamanime does not store any files on our server, <br /> we only link
          to media hosted on 3rd party services.
        </p>
        <p className="mt-4 text-gray-500">© kamanime All rights reserved.</p>

        <div className="btns flex justify-center my-2 items-center gap-2">
          <a
            href="https://discord.gg/pAcf7RGxuy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-500 hover:text-indigo-400 text-2xl"
          >
            <FaDiscord />
          </a>
        </div>
      </div>
    </div>
  );
};

export default Footer;
