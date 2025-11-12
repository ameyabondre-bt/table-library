/**
 * TABLE LIBRARY - Smart Frontend Table Library
 * A lightweight, customizable table library with filtering, actions, and rich data display
 */

(function (global) {
  "use strict";

  class TableLibrary {
    /**
     * Initialize the table library with configuration
     */
    constructor(config = {}) {
      this.config = {
        container: config.container || "body",
        headings: config.headings || [],
        data: config.data || [],
        tableID: config.tableID || "smart-table-" + Date.now(),
        hideColumns: config.hideColumns || [],
        modifyConfig: config.modifyConfig || {},
        ...config,
      };

      this.processedData = [];
      this.processedHeadings = [];

      this.init();
    }

    /**
     * Format dates in a user-friendly way
     */
    formatDateOrTimestamp(dateObj) {
      if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) return "";

      const isDateOnly =
        dateObj.getUTCHours() === 0 &&
        dateObj.getUTCMinutes() === 0 &&
        dateObj.getUTCSeconds() === 0;

      const options = isDateOnly
        ? { day: "2-digit", month: "short", year: "numeric" }
        : {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          };

      return new Intl.DateTimeFormat("en-IN", options).format(dateObj);
    }

    /**
     * Apply user-defined modifications to specific cells or columns
     */
    applyModifications(data, headings) {
      if (!this.config.modifyConfig) return data;

      return data.map((row, rowIndex) =>
        row.map((cell, colIndex) => {
          const heading = headings[colIndex];
          const ruleByHeading = this.config.modifyConfig[heading];
          const ruleByIndex =
            this.config.modifyConfig[`${rowIndex},${colIndex}`];

          let modified = cell;
          try {
            if (typeof ruleByHeading === "function") {
              modified = ruleByHeading(cell, row, rowIndex, colIndex);
            }
            if (typeof ruleByIndex === "function") {
              modified = ruleByIndex(cell, row, rowIndex, colIndex);
            }
          } catch (err) {
            console.error(
              `Error modifying ${heading}[${rowIndex},${colIndex}]:`,
              err
            );
          }
          return modified;
        })
      );
    }

    /**
     * Hide specified columns from the table
     */
    hideColumns(headings, data) {
      const hideCols = Array.isArray(this.config.hideColumns)
        ? this.config.hideColumns
        : [this.config.hideColumns];

      const hideIndexes = hideCols
        .map((col) => (typeof col === "number" ? col : headings.indexOf(col)))
        .filter((i) => i >= 0);

      return {
        headings: headings.filter((_, i) => !hideIndexes.includes(i)),
        data: data.map((row) => row.filter((_, i) => !hideIndexes.includes(i))),
      };
    }

    /**
     * Generate HTML for the table
     */
    generateHTML(headings, data) {
      const { tableID } = this.config;

      let tableHTML = `
        <div class="table-library-container">
          <table id="${tableID}">
            <thead>
              <tr>
                ${headings
                  .map(
                    (heading, i) => `
                  <th>
                    <div>${heading}</div>
                    <input type="text" placeholder="Filter ${heading}" />
                  </th>
                `
                  )
                  .join("")}
              </tr>
            </thead>
            <tbody>
              ${data
                .map(
                  (row, rowIndex) => `
                <tr data-row-index="${rowIndex}">
                  ${row
                    .map(
                      (cell, colIndex) => `
                    <td data-heading="${headings[colIndex]}">
                      ${this.renderCell(cell, rowIndex, colIndex)}
                    </td>
                  `
                    )
                    .join("")}
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </div>
      `;

      return tableHTML;
    }

    /**
     * Render individual cell content based on data type
     */
    renderCell(cell, rowIndex, colIndex) {
      if (cell === null || cell === undefined) {
        return '<span class="table-library-null">-</span>';
      }

      if (typeof cell === "object" && cell !== null) {
        if (cell.type === "url") {
          return `<a href="${
            cell.value
          }" target="_blank" class="table-library-url">${
            cell.placeholder || "Open"
          }</a>`;
        }

        if (cell.type === "button") {
          const hasCheckbox = cell.checkbox ? "has-checkbox" : "";
          const checkedAttr = cell.checkboxValue ? "checked" : "";

          return `
            <div class="table-library-action-cell ${hasCheckbox}">
              <button class="table-library-action-btn" 
                      data-fn="${cell.function}" 
                      data-row-index="${rowIndex}">
                ${cell.placeholder || "Action"}
              </button>
              ${
                cell.checkbox
                  ? `
                <label class="table-library-checkbox-label">
                  <input type="checkbox" ${checkedAttr}
                    class="table-library-action-checkbox" 
                    data-row-index="${rowIndex}"
                    data-fn="${cell.function}" />
                  <span>${cell.checkboxLabel || "Mark"}</span>
                </label>
              `
                  : ""
              }
            </div>
          `;
        }

        return `<pre class="table-library-object">${JSON.stringify(
          cell,
          null,
          2
        )}</pre>`;
      }

      if (Array.isArray(cell)) {
        if (cell.length === 0)
          return '<span class="table-library-empty">[]</span>';
        return `<span class="table-library-array" title="${cell.join(
          ", "
        )}">[${cell.join(", ")}]</span>`;
      }

      if (cell instanceof Date && !isNaN(cell.getTime())) {
        return `<span class="table-library-date">${this.formatDateOrTimestamp(
          cell
        )}</span>`;
      }

      if (typeof cell === "boolean") {
        return `<span class="table-library-boolean ${
          cell ? "true" : "false"
        }">${cell ? "Yes" : "No"}</span>`;
      }

      if (typeof cell === "number") {
        return `<span class="table-library-number">${cell}</span>`;
      }

      const text = String(cell);
      return `<span class="table-library-text" title="${text}">${text}</span>`;
    }

    /**
     * Initialize the table - main entry point
     */
    init() {
      let processed = this.hideColumns(this.config.headings, this.config.data);
      let finalData = this.applyModifications(
        processed.data,
        processed.headings
      );

      this.processedData = finalData;
      this.processedHeadings = processed.headings;

      const container =
        typeof this.config.container === "string"
          ? document.querySelector(this.config.container)
          : this.config.container;

      if (!container) {
        console.error("TableLibrary: Container not found");
        return;
      }

      container.innerHTML = this.generateHTML(processed.headings, finalData);
      this.attachEventListeners();
    }

    /**
     * Attach all event listeners for interactivity
     */
    attachEventListeners() {
      const { tableID } = this.config;

      // Debounce function for performance
      const debounce = (fn, delay) => {
        let timeout;
        return (...args) => {
          clearTimeout(timeout);
          timeout = setTimeout(() => fn(...args), delay);
        };
      };

      // Filter functionality
      const filterTable = () => {
        const inputs = document.querySelectorAll(`#${tableID} thead input`);
        const rows = document.querySelectorAll(`#${tableID} tbody tr`);

        rows.forEach((row) => {
          let visible = true;
          inputs.forEach((input, i) => {
            const filter = input.value.trim().toLowerCase();
            if (filter) {
              const text = (row.cells[i]?.textContent || "").toLowerCase();
              if (!text.includes(filter)) visible = false;
            }
          });
          row.style.display = visible ? "" : "none";
        });
      };

      // Filter events
      document
        .querySelectorAll(`#${tableID} thead input`)
        .forEach((input) =>
          input.addEventListener("input", debounce(filterTable, 300))
        );

      // Button click events - FIXED: Only call user function once
      document.querySelectorAll(".table-library-action-btn").forEach((btn) => {
        btn.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();

          const fnName = btn.dataset.fn;
          const rowIndex = parseInt(btn.dataset.rowIndex);
          const rowData = this.processedData[rowIndex];

          // Visual feedback
          btn.style.transform = "scale(0.95)";
          setTimeout(() => {
            btn.style.transform = "";
          }, 150);

          // FIXED: Call user function only once
          this.callUserFunction(fnName, rowData, rowIndex);

          // FIXED: Auto-check the checkbox when button is clicked
          const checkbox = btn
            .closest(".table-library-action-cell")
            ?.querySelector(".table-library-action-checkbox");
          if (checkbox) {
            checkbox.checked = true;
            this.handleCheckboxChange(rowData, rowIndex, true);
          }
        });
      });

      // Checkbox change events
      document
        .querySelectorAll(".table-library-action-checkbox")
        .forEach((cb) => {
          cb.addEventListener("click", (e) => {
            e.stopPropagation();
          });

          cb.addEventListener("change", (e) => {
            const rowIndex = parseInt(cb.dataset.rowIndex);
            const fnName = cb.dataset.fn;
            const rowData = this.processedData[rowIndex];

            this.handleCheckboxChange(rowData, rowIndex, cb.checked);

            if (fnName) {
              this.callUserFunction(
                fnName + "Checkbox",
                rowData,
                rowIndex,
                cb.checked
              );
            }
          });
        });
    }

    /**
     * Call user-defined function from global scope
     */
    callUserFunction(fnName, rowData, rowIndex, checkboxState = null) {
      if (typeof window[fnName] === "function") {
        if (checkboxState !== null) {
          window[fnName](rowData, rowIndex, checkboxState);
        } else {
          window[fnName](rowData, rowIndex);
        }
        return true;
      }

      console.warn(`Function ${fnName} not found in global scope`);
      return false;
    }

    /**
     * Handle checkbox visual changes
     */
    handleCheckboxChange(rowData, rowIndex, checked) {
      const row = document.querySelector(`[data-row-index="${rowIndex}"]`);

      if (checked) {
        row.style.backgroundColor = "#e6fffa";
        row.classList.add("table-library-row-checked");
      } else {
        row.style.backgroundColor = "";
        row.classList.remove("table-library-row-checked");
      }
    }

    /**
     * PUBLIC API: Update table with new data
     */
    updateData(newData) {
      this.config.data = newData;
      this.init();
    }

    /**
     * PUBLIC API: Get current table data
     */
    getData() {
      return this.config.data;
    }

    /**
     * PUBLIC API: Get checked rows
     */
    getCheckedRows() {
      const checkedRows = [];
      document
        .querySelectorAll(".table-library-action-checkbox:checked")
        .forEach((cb) => {
          const rowIndex = parseInt(cb.dataset.rowIndex);
          checkedRows.push({
            index: rowIndex,
            data: this.processedData[rowIndex],
          });
        });
      return checkedRows;
    }
  }

  /**
   * GLOBAL INITIALIZATION FUNCTION
   */
  global.initTableLibrary = function (config) {
    return new TableLibrary(config);
  };
})(window);

// // table-library.js - Smart Frontend Table Library
// (function (global) {
//   "use strict";

//   class TableLibrary {
//     constructor(config = {}) {
//       this.config = {
//         container: config.container || "body",
//         headings: config.headings || [],
//         data: config.data || [],
//         tableID: config.tableID || "smart-table-" + Date.now(),
//         hideColumns: config.hideColumns || [],
//         modifyConfig: config.modifyConfig || {},
//         ...config,
//       };

//       this.init();
//     }

//     // Format date in a user-friendly way
//     formatDateOrTimestamp(dateObj) {
//       if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) return "";

//       const isDateOnly =
//         dateObj.getUTCHours() === 0 &&
//         dateObj.getUTCMinutes() === 0 &&
//         dateObj.getUTCSeconds() === 0;

//       const options = isDateOnly
//         ? { day: "2-digit", month: "short", year: "numeric" }
//         : {
//             day: "2-digit",
//             month: "short",
//             year: "numeric",
//             hour: "2-digit",
//             minute: "2-digit",
//             hour12: true,
//           };

//       return new Intl.DateTimeFormat("en-IN", options).format(dateObj);
//     }

//     // Calculate days ago for dates
//     getDaysAgo(dateObj) {
//       if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) return 0;
//       const today = new Date();
//       return Math.floor((today - dateObj) / (1000 * 60 * 60 * 24));
//     }

//     // Apply user modifications to data
//     applyModifications(data, headings) {
//       if (!this.config.modifyConfig) return data;

//       return data.map((row, rowIndex) =>
//         row.map((cell, colIndex) => {
//           const heading = headings[colIndex];
//           const ruleByHeading = this.config.modifyConfig[heading];
//           const ruleByIndex =
//             this.config.modifyConfig[`${rowIndex},${colIndex}`];

//           let modified = cell;
//           try {
//             if (typeof ruleByHeading === "function") {
//               modified = ruleByHeading(cell, row, rowIndex, colIndex);
//             }
//             if (typeof ruleByIndex === "function") {
//               modified = ruleByIndex(cell, row, rowIndex, colIndex);
//             }
//           } catch (err) {
//             console.error(
//               `Error modifying ${heading}[${rowIndex},${colIndex}]:`,
//               err
//             );
//           }
//           return modified;
//         })
//       );
//     }

//     // Hide specified columns
//     hideColumns(headings, data) {
//       const hideCols = Array.isArray(this.config.hideColumns)
//         ? this.config.hideColumns
//         : [this.config.hideColumns];

//       const hideIndexes = hideCols
//         .map((col) => (typeof col === "number" ? col : headings.indexOf(col)))
//         .filter((i) => i >= 0);

//       return {
//         headings: headings.filter((_, i) => !hideIndexes.includes(i)),
//         data: data.map((row) => row.filter((_, i) => !hideIndexes.includes(i))),
//       };
//     }

//     // Generate HTML table
//     generateHTML(headings, data) {
//       const { tableID } = this.config;

//       let tableHTML = `
//         <div class="table-library-container">
//           <table id="${tableID}">
//             <thead>
//               <tr>
//                 ${headings
//                   .map(
//                     (heading, i) => `
//                   <th>
//                     <div>${heading}</div>
//                     <input type="text" placeholder="Filter ${heading}" />
//                   </th>
//                 `
//                   )
//                   .join("")}
//               </tr>
//             </thead>
//             <tbody>
//               ${data
//                 .map(
//                   (row, rowIndex) => `
//                 <tr data-row-index="${rowIndex}">
//                   ${row
//                     .map(
//                       (cell, colIndex) => `
//                     <td data-heading="${headings[colIndex]}">
//                       ${this.renderCell(cell, rowIndex, colIndex)}
//                     </td>
//                   `
//                     )
//                     .join("")}
//                 </tr>
//               `
//                 )
//                 .join("")}
//             </tbody>
//           </table>
//         </div>
//       `;

//       return tableHTML;
//     }

//     // Render individual cell content
//     renderCell(cell, rowIndex, colIndex) {
//       // Handle null/undefined
//       if (cell === null || cell === undefined) {
//         return '<span class="table-library-null">-</span>';
//       }

//       // Handle action objects (url, button)
//       if (typeof cell === "object" && cell !== null) {
//         // URL type
//         if (cell.type === "url") {
//           return `<a href="${
//             cell.value
//           }" target="_blank" class="table-library-url">${
//             cell.placeholder || "Open"
//           }</a>`;
//         }

//         // Button type
//         if (cell.type === "button") {
//           const hasCheckbox = cell.checkbox ? "has-checkbox" : "";
//           const checkedAttr = cell.checkboxValue ? "checked" : "";

//           return `
//             <div class="table-library-action-cell ${hasCheckbox}">
//               <button class="table-library-action-btn"
//                       data-fn="${cell.function}"
//                       data-row-index="${rowIndex}">
//                 ${cell.placeholder || "Action"}
//               </button>
//               ${
//                 cell.checkbox
//                   ? `
//                 <label class="table-library-checkbox-label">
//                   <input type="checkbox" ${checkedAttr}
//                     class="table-library-action-checkbox"
//                     data-row-index="${rowIndex}"
//                     data-fn="${cell.function}" />
//                   <span>${cell.checkboxLabel || "Mark"}</span>
//                 </label>
//               `
//                   : ""
//               }
//             </div>
//           `;
//         }

//         // Regular objects - show as JSON
//         return `<pre class="table-library-object">${JSON.stringify(
//           cell,
//           null,
//           2
//         )}</pre>`;
//       }

//       // Handle arrays
//       if (Array.isArray(cell)) {
//         if (cell.length === 0)
//           return '<span class="table-library-empty">[]</span>';
//         return `<span class="table-library-array" title="${cell.join(
//           ", "
//         )}">[${cell.join(", ")}]</span>`;
//       }

//       // Handle dates
//       if (cell instanceof Date && !isNaN(cell.getTime())) {
//         return `<span class="table-library-date">${this.formatDateOrTimestamp(
//           cell
//         )}</span>`;
//       }

//       // Handle booleans
//       if (typeof cell === "boolean") {
//         return `<span class="table-library-boolean ${
//           cell ? "true" : "false"
//         }">${cell ? "Yes" : "No"}</span>`;
//       }

//       // Handle numbers
//       if (typeof cell === "number") {
//         return `<span class="table-library-number">${cell}</span>`;
//       }

//       // Default: string representation
//       const text = String(cell);
//       return `<span class="table-library-text" title="${text}">${text}</span>`;
//     }

//     // Initialize the table
//     init() {
//       // Process data
//       let processed = this.hideColumns(this.config.headings, this.config.data);
//       let finalData = this.applyModifications(
//         processed.data,
//         processed.headings
//       );

//       // Store processed data
//       this.processedData = finalData;
//       this.processedHeadings = processed.headings;

//       // Generate and insert HTML
//       const container =
//         typeof this.config.container === "string"
//           ? document.querySelector(this.config.container)
//           : this.config.container;

//       if (!container) {
//         console.error("TableLibrary: Container not found");
//         return;
//       }

//       container.innerHTML = this.generateHTML(processed.headings, finalData);

//       // Initialize functionality
//       this.attachEventListeners();
//     }

//     // Attach event listeners
//     attachEventListeners() {
//       const { tableID } = this.config;

//       // Filter functionality
//       const debounce = (fn, delay) => {
//         let timeout;
//         return (...args) => {
//           clearTimeout(timeout);
//           timeout = setTimeout(() => fn(...args), delay);
//         };
//       };

//       const filterTable = () => {
//         const inputs = document.querySelectorAll(`#${tableID} thead input`);
//         const rows = document.querySelectorAll(`#${tableID} tbody tr`);

//         rows.forEach((row) => {
//           let visible = true;
//           inputs.forEach((input, i) => {
//             const filter = input.value.trim().toLowerCase();
//             if (filter) {
//               const text = (row.cells[i]?.textContent || "").toLowerCase();
//               if (!text.includes(filter)) visible = false;
//             }
//           });
//           row.style.display = visible ? "" : "none";
//         });
//       };

//       // Filter events
//       document
//         .querySelectorAll(`#${tableID} thead input`)
//         .forEach((input) =>
//           input.addEventListener("input", debounce(filterTable, 300))
//         );

//       // Button click events
//       document.querySelectorAll(".table-library-action-btn").forEach((btn) => {
//         btn.addEventListener("click", (e) => {
//           e.preventDefault();
//           const fnName = btn.dataset.fn;
//           const rowIndex = parseInt(btn.dataset.rowIndex);
//           const rowData = this.processedData[rowIndex];

//           // Visual feedback
//           btn.style.transform = "scale(0.95)";
//           setTimeout(() => {
//             btn.style.transform = "";
//           }, 150);

//           // Call user function
//           this.callUserFunction(fnName, rowData, rowIndex);

//           // Call user function and get return value
//           const result = this.callUserFunction(fnName, rowData, rowIndex);

//           // If user function returns true, then check the checkbox
//           // This gives users control over when to check the checkbox
//           if (result === true) {
//             const checkbox = btn
//               .closest(".table-library-action-cell")
//               ?.querySelector(".table-library-action-checkbox");
//             if (checkbox) {
//               checkbox.checked = true;
//               this.handleCheckboxChange(rowData, rowIndex, true);
//             }
//           }

//           // // Auto-check related checkbox
//           // const checkbox = btn
//           //   .closest(".table-library-action-cell")
//           //   ?.querySelector(".table-library-action-checkbox");
//           // if (checkbox) {
//           //   checkbox.checked = true;
//           //   this.handleCheckboxChange(rowData, rowIndex, true);
//           // }
//         });
//       });

//       // Checkbox change events
//       document
//         .querySelectorAll(".table-library-action-checkbox")
//         .forEach((cb) => {
//           cb.addEventListener("change", () => {
//             const rowIndex = parseInt(cb.dataset.rowIndex);
//             const fnName = cb.dataset.fn;
//             const rowData = this.processedData[rowIndex];
//             this.handleCheckboxChange(rowData, rowIndex, cb.checked);

//             // Call checkbox function if exists
//             if (fnName) {
//               this.callUserFunction(
//                 fnName + "Checkbox",
//                 rowData,
//                 rowIndex,
//                 cb.checked
//               );
//             }
//           });
//         });
//     }

//     // Call user-defined function
//     callUserFunction(fnName, rowData, rowIndex, checkboxState = null) {
//       // Check global scope first
//       if (typeof window[fnName] === "function") {
//         if (checkboxState !== null) {
//           return window[fnName](rowData, rowIndex, checkboxState);
//         } else {
//           return window[fnName](rowData, rowIndex);
//         }
//       }

//       console.warn(`Function ${fnName} not found`);
//       return false;
//     }

//     // Handle checkbox changes
//     handleCheckboxChange(rowData, rowIndex, checked) {
//       const row = document.querySelector(`[data-row-index="${rowIndex}"]`);

//       if (checked) {
//         row.style.backgroundColor = "#e6fffa";
//         row.classList.add("table-library-row-checked");
//       } else {
//         row.style.backgroundColor = "";
//         row.classList.remove("table-library-row-checked");
//       }
//     }

//     // Public method to update data
//     updateData(newData) {
//       this.config.data = newData;
//       this.init();
//     }
//   }

//   // Global initialization function
//   global.initTableLibrary = function (config) {
//     return new TableLibrary(config);
//   };
// })(window);
