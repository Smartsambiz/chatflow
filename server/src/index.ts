import express from "express";
const app = express();

const PORT = process.env.PORT || 3000;

app.get("/health", (_req, res)=>{
    res.json({
        status: "ok",
        service: "Chatflow API"
    })
});

app.listen(PORT, ()=>{
    console.log(`Server is running on port ${PORT}`);
})