const mongoose=require('mongoose');
const {Schema,model}=require('mongoose');

const userSchema=new mongoose.Schema({
  username:{type:String,required:true,min:4,unique:true},
  password:{type:String,required:true},
});

const UserModel=model('User',userSchema)
module.exports = UserModel;