
const importAreaData = async (zip: Zip, db: LocalMLDatabase, cache: ReturnType<typeof makeCache>) => {
    console.log("importAreaData", zip)
    const loadingPromises = [];
    const readJson = (path: string) => zip.file(path).async("text").then(JSON.parse);
    const readJsonf = (file) => file.async("text").then(JSON.parse);

    console.log("reading settings file")
    const data = JSON.parse(await zip.file("area_settings.json").async("string"))
    const areaId = data.aid;
    console.log("reading settings file ok", { areaId, data, zip })


    console.log("storing area data")
    await db.area_setData(data);
    console.log("adding zip to cache")
    await cache.addArea(areaId, zip);
    console.log("storing area data ok")


    console.log("storing thumbnail")
    await zip.file("thumbnail.png").async("blob").then((blob) => cache.addAreaThumb(data.aun, blob))
    console.log("storing thumbnail ok")


    console.log("storing creations")
    zip.folder("creations/").forEach((path, file) => {
        const filenameWithoutExtension = path.slice(0, path.lastIndexOf("."))
        if (filenameWithoutExtension.length !== 24) {
            console.warn("got a file that does not seem to be a creationId!", path, file)
            return;
        }

        if (path.endsWith(".png")) {
            console.log("adding", filenameWithoutExtension, "to cache (sprite)")
            loadingPromises.push(
                file.async("blob").then(blob => cache.setCreationSprite(filenameWithoutExtension, blob))
            )
        }
        else if (path.endsWith(".json")) {
            console.log("adding", filenameWithoutExtension, "to cache (def)")
            loadingPromises.push(
                file.async("text").then(text => cache.setCreationDef(filenameWithoutExtension, text))
            )
        }
    })

    zip.folder("creations-data/holders/").forEach((path, file) => {
        const id = path.slice(0, path.lastIndexOf("."))
        if (id.length !== 24) {
            console.warn("got a file that does not seem to be a creationId!", path, file)
            return;
        }

        loadingPromises.push( readJsonf(file).then(data => db.creation_setHolderContent(id, data)) );
    })
    zip.folder("creations-data/multis/").forEach((path, file) => {
        const id = path.slice(0, path.lastIndexOf("."))
        if (id.length !== 24) {
            console.warn("got a file that does not seem to be a creationId!", path, file)
            return;
        }

        loadingPromises.push( readJsonf(file).then(data => db.creation_setMultiData(id, data)) );
    })

    await Promise.all(loadingPromises);

    return data;
}