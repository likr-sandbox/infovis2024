import * as d3 from "d3";
import d3cloud from "d3-cloud";

(async () => {
  const segmenter = new Intl.Segmenter("ja-JP", { granularity: "word" });

  const timeFormat = d3.timeParse("%B %d, %Y at %I:%M%p");
  const text = await d3.text("data.csv");
  const originalData = d3.csvParseRows(text, ([time, userId, text]) => ({
    time: timeFormat(time),
    userId,
    text,
    words: [...segmenter.segment(text)]
      .filter((d) => d.isWordLike)
      .map((d) => d.segment),
  }));
  let data = originalData;

  function timelineChart(svg) {
    const timelineData = d3.rollups(
      data,
      (v) => v.length,
      (d) => d3.timeHour.ceil(d.time),
    );

    const containerWidth = svg.property("clientWidth");
    const containerHeight = svg.property("clientHeight");
    const marginTop = 10;
    const marginLeft = 50;
    const marginBottom = 100;
    const marginRight = 50;
    const chartWidth = containerWidth - marginLeft - marginRight;
    const chartHeight = containerHeight - marginTop - marginBottom;

    const x = d3
      .scaleTime()
      .domain(d3.extent(timelineData, (d) => d[0]))
      .range([0, chartWidth]);
    const y = d3
      .scaleLinear()
      .domain([0, d3.max(timelineData, (d) => d[1])])
      .range([chartHeight, 0])
      .nice();
    const line = d3
      .line()
      .x((d) => x(d[0]))
      .y((d) => y(d[1]));
    const content = svg
      .append("g")
      .attr("transform", `translate(${marginLeft},${marginTop})`);
    content
      .append("g")
      .append("path")
      .attr("fill", "none")
      .attr("stroke", "#888")
      .attr("d", line(timelineData));
    const yAxis = content.append("g");
    yAxis
      .append("line")
      .attr("x1", 0)
      .attr("y1", 0)
      .attr("x2", 0)
      .attr("y2", chartHeight)
      .attr("stroke", "#888");
    yAxis
      .append("g")
      .selectAll("g")
      .data(y.ticks())
      .enter()
      .append("g")
      .attr("transform", (d) => `translate(0, ${y(d)})`);
    const yTicks = yAxis.select("g").selectAll("g");
    yTicks
      .append("line")
      .attr("x1", 0)
      .attr("y1", 0)
      .attr("x2", -10)
      .attr("y2", 0)
      .attr("stroke", "#888");
    yTicks
      .append("text")
      .attr("x", -15)
      .attr("text-anchor", "end")
      .attr("dominant-baseline", "central")
      .attr("fill", "#888")
      .text((d) => d);
    const xAxis = content
      .append("g")
      .attr("transform", `translate(0,${chartHeight})`);
    xAxis
      .append("line")
      .attr("x1", 0)
      .attr("y1", 0)
      .attr("x2", chartWidth)
      .attr("y2", 0)
      .attr("stroke", "#888");
    xAxis.append("g").selectAll("g").data(x.ticks()).enter().append("g");
    const xTicks = xAxis
      .select("g")
      .selectAll("g")
      .attr("transform", (d) => `translate(${x(d)},0)`);
    xTicks
      .append("line")
      .attr("x1", 0)
      .attr("y1", 0)
      .attr("x2", 0)
      .attr("y2", 10)
      .attr("stroke", "#888");
    const timeFormat = d3.timeFormat("%m/%d %H:%M");
    xTicks
      .append("text")
      .attr("dominant-baseline", "central")
      .attr("fill", "#888")
      .attr("transform", "translate(0,15)rotate(45)")
      .text((d) => timeFormat(d));

    const brush = d3
      .brushX()
      .extent([
        [0, 0],
        [chartWidth, chartHeight],
      ])
      .on("end", (event) => {
        if (event.selection) {
          const start = x.invert(event.selection[0]);
          const end = x.invert(event.selection[1]);
          data = originalData.filter((d) => start <= d.time && d.time <= end);
          d3.select(".app-wordcloud").select("svg").call(wordcloud);
        }
      });
    content.call(brush);
  }

  d3.select(".app-timeline").select("svg").call(timelineChart);

  function wordcloud(svg) {
    const wordCount = d3.rollups(
      data.flatMap((d) => d.words),
      (v) => v.length,
      (d) => d,
    );
    d3.sort(wordCount, (a, b) => d3.descending(a[1], b[1]));
    const containerWidth = svg.property("clientWidth");
    const containerHeight = svg.property("clientHeight");
    const marginTop = 50;
    const marginLeft = 50;
    const marginBottom = 50;
    const marginRight = 50;
    const chartWidth = containerWidth - marginLeft - marginRight;
    const chartHeight = containerHeight - marginTop - marginBottom;
    const content = svg
      .select("g")
      .attr("transform", `translate(${marginLeft},${marginTop})`)
      .select("g")
      .attr("transform", `translate(${chartWidth / 2},${chartHeight / 2})`);

    const sizeScale = d3
      .scaleSqrt()
      .domain([0, d3.max(wordCount, (d) => d[1])])
      .range([10, 200]);
    d3cloud()
      .size([chartWidth, chartHeight])
      .words(wordCount)
      .text((d) => d[0])
      .rotate(() => 0)
      .font('"Shippori Mincho B1"')
      .fontSize((d) => sizeScale(d[1]))
      .random(Math.random)
      .on("end", (words) => {
        content.selectAll("g").data(words).enter().append("g").append("text");
        content
          .selectAll("g")
          .select("text")
          .transition()
          .text((d) => d[0])
          .attr("font-size", (d) => d.size)
          .attr("font-family", '"Shippori Mincho B1"')
          .attr("fill", "#888")
          .attr("text-anchor", "middle")
          .style("user-select", "none")
          .attr(
            "transform",
            (d) => `translate(${d.x},${d.y})rotate(${d.rotate})`,
          );
        content.selectAll("g").exit().remove();
      })
      .start();
  }
  d3.select(".app-wordcloud").select("svg").call(wordcloud);
})();
