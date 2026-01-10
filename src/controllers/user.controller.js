import {asyncHandler} from '../utils/asyncHandler.js'
import {ApiErrors} from "../utils/ApiErrors.js"
import {User} from "../models/user.models.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from '../utils/ApiResponse.js'

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

export {registerUser,}