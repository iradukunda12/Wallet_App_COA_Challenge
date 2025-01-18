import pool from "../libs/database.js";
import { comparePassword, createJWT, hashPassword } from "../libs/index.js";

const onSubmit = async (data) => {
  try {
    setLoading(true);

    // Detailed logging of data being sent
    console.log(
      "Submitting data (stringified):",
      JSON.stringify(data, null, 2)
    );

    // Ensure all required fields are present
    if (!data.firstname || !data.email || !data.password) {
      toast.error("Please fill in all required fields");
      return;
    }

    const { data: res } = await api.post("/auth/sign-up", data, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (res?.user) {
      toast.success("Account created successfully. You can now login");
      console.log("Response from server:", res);

      setTimeout(() => {
        navigate("sign-in");
      }, 1500);
    }
  } catch (error) {
    // Even more detailed error logging
    console.error("Full error object:", error);
    console.error("Error response data:", error.response?.data);
    console.error("Error response status:", error.response?.status);
    console.error("Error message:", error.message);

    toast.error(
      error?.response?.data?.message ||
        "An error occurred. Please check your input and try again."
    );
  } finally {
    setLoading(false);
  }
};

export const signupUser = async (req, res) => {
  try {
    const { firstname, email, password } = req.body;

    if (!(firstname && email && password)) {
      return res.status(400).json({
        status: "failed",
        message: "All fields are required!",
      });
    }

    const userExist = await pool.query(
      "SELECT EXISTS (SELECT 1 FROM tbluser WHERE email = $1)",
      [email]
    );

    if (userExist.rows[0].exists) {
      return res.status(409).json({
        status: "failed",
        message: "Email address already exists. Try logging in again",
      });
    }

    const hashedPassword = await hashPassword(password);

    const user = await pool.query(
      "INSERT INTO tbluser (firstname, email, password) VALUES ($1, $2, $3) RETURNING *",
      [firstname, email, hashedPassword]
    );

    const userResponse = { ...user.rows[0] };
    delete userResponse.password;

    res.status(201).json({
      status: "success",
      message: "User account created successfully",
      user: userResponse,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      status: "failed",
      message: error.message,
    });
  }
};

export const signinUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!(email || password)) {
      return res.status(404).json({
        status: "failed",
        message: "Provide Required Fields!",
      });
    }

    const result = await pool.query({
      text: `SELECT * FROM tbluser WHERE email = $1`,
      values: [email],
    });

    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({
        status: "failed",
        message: "Invalid email or password.",
      });
    }

    const isMatch = await comparePassword(password, user?.password);

    if (!isMatch) {
      return res.status(404).json({
        status: "failed",
        message: "Invalid email or password",
      });
    }

    const token = createJWT(user.id);

    user.password = undefined;

    res.status(200).json({
      status: "success",
      message: "Login successfully",
      user,
      token,
    });
  } catch (error) {
    console.log(error);
    res.status(500).json({
      status: "failed",
      message: error.message,
    });
  }
};
