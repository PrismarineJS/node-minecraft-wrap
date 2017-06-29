const etagDownload=require("./etag_download");

module.exports.downloadServer=function(minecraftVersion,filename,done)
{
  etagDownload("https://s3.amazonaws.com/Minecraft.Download/versions/"+minecraftVersion+
    "/minecraft_server."+minecraftVersion+".jar",filename, done);
};

module.exports.downloadClient=function(minecraftVersion,filename,done)
{
  etagDownload("https://s3.amazonaws.com/Minecraft.Download/versions/"+minecraftVersion+
    "/"+minecraftVersion+".jar",filename, done);
};