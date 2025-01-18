import React, { useEffect, useState } from "react";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "./../libs/firebaseConfig";
import useStore from "../store";
import { toast } from "sonner";
import { FcGoogle } from "react-icons/fc";
import { useNavigate } from "react-router-dom";
import { Button } from "./button";
import api from "../libs/apiCalls";

export const SocialAuth = ({ isLoading, setLoading }) => {
  const [user] = useAuthState(auth);
  const [selectedProvider, setSelectedProvider] = useState("google");
  const { setCredentials } = useStore((state) => state);
  const navigate = useNavigate();

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    setSelectedProvider("google");

    try {
      const res = await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error signing with Google", error);
    }
  };

  useEffect(() => {
    const saveUserToDb = async () => {
      try {
        const userData = {
          name: user.displayName,
          email: user.email,
          provider: selectedProvider,
          uid: user.uid,
        };
        setLoading(true);
        const { data: res } = await api.post("/auth/sign-in", userData);

        if (res?.user) {
          toast.success(res?.message);
          const userInfo = { ...res?.user, token: res?.token };
          localStorage.setItem("user", JSON.stringify(userInfo));
          setCredentials(userInfo);

          setTimeout(() => {
            navigate("/overview");
          }, 1500);
        }
      } catch (error) {
        console.error("Something went wrong:", error);
        toast.error(error?.response?.data?.message || error.message);
      } finally {
        setLoading(false);
      }
    };
    if (user) {
      saveUserToDb();
    }
  }, [user?.uid]);

  return (
    <div className='flex items-center gap-2'>
      <Button
        onClick={signInWithGoogle}
        disabled={isLoading}
        variant='outline'
        className='w-full text-sm font-normal dark:bg-transparent dark:border-gray-800 dark:text-gray-400'
        type='button'
      >
        <FcGoogle className='mr-2 size-5'></FcGoogle>
        Continue with Google
      </Button>
    </div>
  );
};
