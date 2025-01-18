import React, { useEffect, useState } from "react";
import * as z from "zod";
import useStore from "../../store";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardFooter,
} from "../../components/card";
import { useNavigate, Link } from "react-router-dom";
import { SocialAuth } from "../../components/social-auth";
import { Separator } from "../../components/separator";
import Input from "../../components/input";
import { Button } from "../../components/button";
import { BiLoader } from "react-icons/bi";
import { toast } from "sonner";
import api from "../../libs/apiCalls";

const RegistrationSchema = z.object({
  email: z
    .string({ required_error: "email is required" })
    .email({ message: "Invalid email address" }),
  firstname: z
    .string({ required_error: "Name is required" })
    .min(3, "Name is required"),
  password: z
    .string({ required_error: "Password is required" })
    .min(1, "Password is required"),
});

function SignUp() {
  const { user } = useStore((state) => state);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(RegistrationSchema),
  });

  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    user && navigate("/");
  }, [user]);

  const onSubmit = async (data) => {
    try {
      setLoading(true);
      const { data: res } = await api.post("/auth/sign-up", data);
      if (res?.user) {
        toast.success("Account created successfully.You can now login");

        setTimeout(() => {
          navigate("/sign-in");
        }, 1500);
      }
    } catch (error) {
      console.log(error);
      toast.error(error?.response?.data?.message || error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='flex items-center justify-center w-full min-h-screen py-10'>
      <Card className='w-[400px] bg-white dark:bg-black/20 shadow-md overflow-hidden'>
        <div className='p-6 md:-8'>
          <CardHeader className='py-0'>
            <CardTitle className='mb-8 text-center dark:text-white'>
              Create Account
            </CardTitle>
          </CardHeader>
          <CardContent className='p-0'>
            <form onSubmit={handleSubmit(onSubmit)} className=' space-y-2'>
              <div className='mb-8 space-y-6'>
                <SocialAuth
                  isLoading={loading}
                  setLoading={setLoading}
                ></SocialAuth>
                <Separator></Separator>

                <Input
                  disable={loading}
                  id='firstname'
                  label='Name'
                  name='firstname'
                  type='text'
                  placeholder='Enter Your FirstName'
                  error={errors?.firstname?.message}
                  {...register("firstname")}
                  className='text-sm border dark:bg-gray-800 dark:bg-transparent dark:placeholder:text-gray-700 dark:text-gray-400 dark:outline-none'
                ></Input>
                <Input
                  disable={loading}
                  id='email'
                  label='Email'
                  name='email'
                  type='email'
                  placeholder='Enter Your email'
                  error={errors?.email?.message}
                  {...register("email")}
                  className='text-sm border dark:bg-gray-800 dark:bg-transparent dark:placeholder:text-gray-700 dark:text-gray-400 dark:outline-none'
                ></Input>
                <Input
                  disable={loading}
                  id='password'
                  label='Password'
                  name='password'
                  type='password'
                  placeholder='Enter Your password'
                  error={errors?.password?.message}
                  {...register("password")}
                  className='text-sm border dark:bg-gray-800 dark:bg-transparent dark:placeholder:text-gray-700 dark:text-gray-400 dark:outline-none'
                ></Input>
              </div>
              <Button
                type='submit'
                className='w-full bg-violet-800'
                disable={loading}
              >
                {loading ? (
                  <BiLoader className='text-2xl text-white animated'></BiLoader>
                ) : (
                  "Create an account"
                )}
              </Button>
            </form>
          </CardContent>
        </div>
        <CardFooter className='justify-center gap-2'>
          <p className='text-sm text-gray-600'>Already have an account</p>
          <Link
            to='/sign-in'
            className='text-sm font-semibold text-violet-600 hover:underline'
          >
            Sign in
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}

export default SignUp;
