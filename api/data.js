export default async function handler(req, res) {
  try {
    const { type, q, year, id } = req.query;

    let url;

    if (type === "votes") {
      url =
        "https://howtheyvote.eu/api/votes" +
        "?q=" +
        encodeURIComponent(q || "") +
        "&page_size=30" +
        "&sort_by=date" +
        "&sort_order=desc";
    }

    else if (type === "meetings") {
      url =
        "https://data.europarl.europa.eu/api/v2/meetings" +
        "?year=" +
        encodeURIComponent(year || new Date().getFullYear()) +
        "&format=application%2Fld%2Bjson" +
        "&limit=100";
    }

    else if (type === "activities") {
      if (!id) {
        return res.status(400).json({
          error: "Meeting ID required"
        });
      }

      url =
        "https://data.europarl.europa.eu/api/v2/meetings/" +
        encodeURIComponent(id) +
        "/foreseen-activities" +
        "?format=application%2Fld%2Bjson" +
        "&limit=50";
    }

    else {
      return res.status(400).json({
        error: "Unknown request type"
      });
    }

    const response = await fetch(url, {
      headers: {
        "User-Agent": "MEP-Vote-Tracker/1.0"
      }
    });

    const text = await response.text();

    res.setHeader(
      "Cache-Control",
      "s-maxage=900, stale-while-revalidate=3600"
    );

    res.status(response.status);

    const contentType = response.headers.get("content-type");

    if (contentType) {
      res.setHeader("Content-Type", contentType);
    }

    return res.send(text);

  } catch (error) {

    console.error(error);

    return res.status(500).json({
      error: "Unable to retrieve parliamentary data"
    });
  }
}
