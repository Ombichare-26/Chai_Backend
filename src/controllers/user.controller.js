import {asyncHandler} from '../utils/asyncHandler.js'
import {ApiErrors} from "../utils/ApiErrors.js"
import {User} from "../models/user.models.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from '../utils/ApiResponse.js'

const generateAccessAndRefreshToken = async function (userId){
    try {
        const user = User.findById(userId);
        const accessToken = user.generateAccessToken();
        const refreshToken = user.generateRefreshToken();

        // Pass RefreshToken in DB so that we don't need to login again & again after AccessTokenExpiry

        user.refreshToken = refreshToken;
       await user.save({validateBeforeSave: false})   

        return {accessToken, refreshToken}
   
    } catch (error) {
        throw new ApiErrors(500,"Something went Wrong while generating Access and Refresh Token.")
    }
}

const registerUser = asyncHandler(async (req,res)=>{

   //Step 1: get user details from frontend
   //Step 2: validation - not empty
   //Step 3: check if User already exists: Username, Email
   //Step 4: Check for Images, Check for Avatar
   //Step 5: Upload them to Cloudinary, Avatar

   //Step 6: Create User Object - create entry in DB
   //Step 7: Remove Password and Refresh Token field from response

   //Step 8: Check for User Creation
   //Step 9:return res



//Step 1:
    const {fullname, email,username,password} = req.body

    console.log("email: ",email);
    
//Step 2:
    if(
        [fullname,email,username,password].some((field)=>
            field?.trim() === "")
    ){
        throw new ApiErrors(400, "all fields are required")
    }

     //2ndMethod
    // if(fullname === ""){
    //     throw new ApiErrors(400,"fullname is required")
    // }

//Step 3:
   const UserExisted = await User.findOne(
        {
            $or: [{username},{email}]
        }
    )
    if(UserExisted){
        throw new ApiErrors(409, "User with username or email already existed")
    }

//Step 4:
    console.log(req.files);
    
    const avatarLocalPath = req.files?.avatar[0]?.path
    //const coverImageLocalPath = req.files?.coverImage[0]?.path 

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length >0){
        coverImageLocalPath = req.files.coverImage[0].path 
    }
    
    if(!avatarLocalPath){
        throw new ApiErrors(400, "Avatar Image is Required ")
    }

//Step 5:

   const avatar = await uploadOnCloudinary(avatarLocalPath)
   const coverImage = await uploadOnCloudinary(coverImageLocalPath)

   if(!avatar){
    throw new ApiErrors(400, "Avatar is required") 
   }

//Step 6:

   const user =  await User.create({
    fullname,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    username: username.toLowerCase()
   })

//Step 7 and 8:
   const createdUser = await User.findById(user._id).select("-password -refreshToken") //in select we write those thing we don't want to send.

   if(!createdUser){
    throw new ApiErrors(500, "Something went wrong while regestering")
   }

//Step 9:

   return res.status(201).json(
        new ApiResponse(200, createdUser, "User Registered Successfully !!")

   )


})


const loginUser = asyncHandler(async (req,res)=>{
    // Step 1 : req.body -> data
    // Step 2 : Username or email is required

    // Step 3 : Find the user
    // Step 4 : Password check
    // Step 5 : Access & Refresh Token
    // Step 6 : Send Cookies


//Step 1 :

    const {username, email, password} = req.body;

// Step 2 :

    if(!username || !email){
        throw new ApiErrors(400, "Username of email is required.")
    }

// Step 3 :

    const user = await User.findOne({
        $or: [{username},{email}]
    })

    if(!user){
        throw new ApiErrors(400, "User does not exist.")
    }

// Step 4 :

    const isPasswordValid = await user.isPasswordCorrect(password);

    if(!isPasswordValid){
        throw new ApiErrors(401, "Invalid User Credentials. Please Enter Correct Password.")
    }

// Step 5 :

    const {accessToken, refreshToken} = await generateAccessAndRefreshToken(user._id)

// Optional as we don't want to send the password and keep it hidden.

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")


// Step 6 :

    //Cookies can only be modified from Server , not from Frontend
    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken, options)
    .json(
        new ApiResponse(
            200,
        {
        user:loggedInUser, accessToken, refreshToken
        },

        "User loggedIn Successfully."
        )
    )

})




const logoutUser = asyncHandler(async (req,res)=>{
    User.findByIdAndUpdate(
        req.user._id,
        {
            $set:{
                refreshToken: undefined,
            }
        },
        {
            new: true,
        }
    )

    //Cookies can only be modified from Server , not from Frontend
    const options = {
        httpOnly: true,
        secure: true
    }

    return  res
            .status(200)
            .clearCookie("accessToken", options)
            .clearCookie("refreshToken", options)
            .json(
                new ApiResponse(200, {}, "User logged Out Successfully !!")
            )
})

export {registerUser, loginUser, logoutUser};