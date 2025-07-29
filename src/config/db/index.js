// Kết nối đến database 
const mongoose = require('mongoose');
const mongooseDelete = require('mongoose-delete');

async function connect(){
    try{
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Kết nối thành công đến database!!!');
    }
    catch(error){
        console.error(error);
        console.log('Kết nối đến database thất bại. Vui lòng kiểm tra lại!!!');
    }

}

module.exports = { connect };