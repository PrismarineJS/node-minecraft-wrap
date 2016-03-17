var s3Download=require("./s3_public_download");

module.exports=download;

function download(minecraftVersion,filename,done)
{
  s3Download("https://s3.amazonaws.com/Minecraft.Download/versions/"+minecraftVersion+
    "/minecraft_server."+minecraftVersion+".jar",filename, done);
}
