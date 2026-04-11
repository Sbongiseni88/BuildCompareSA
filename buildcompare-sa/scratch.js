const mockMaterials = [
    { name: 'AfriSam All Purpose Cement 50kg (CEM II)', brand: 'AfriSam' }
];
const searchQuery = "hammer";
const qWords = searchQuery.toLowerCase().split(/\\s+/);
console.log("qWords:", qWords);
const distinctItem = mockMaterials.find(m => {
    const targetStr = m.name.toLowerCase() + " " + (m.brand?.toLowerCase() || "");
    const isMatch = qWords.every(w => targetStr.includes(w));
    console.log(`Checking [${targetStr}] against ${qWords.join(',')} -> match? ${isMatch}`);
    return isMatch;
});
console.log("distinctItem:", distinctItem);
