<Global.Microsoft.VisualBasic.CompilerServices.DesignerGenerated()> _
Partial Class frmRptUnpaidList
    Inherits System.Windows.Forms.Form

    'Form overrides dispose to clean up the component list.
    <System.Diagnostics.DebuggerNonUserCode()> _
    Protected Overrides Sub Dispose(ByVal disposing As Boolean)
        Try
            If disposing AndAlso components IsNot Nothing Then
                components.Dispose()
            End If
        Finally
            MyBase.Dispose(disposing)
        End Try
    End Sub

    'Required by the Windows Form Designer
    Private components As System.ComponentModel.IContainer

    'NOTE: The following procedure is required by the Windows Form Designer
    'It can be modified using the Windows Form Designer.  
    'Do not modify it using the code editor.
    <System.Diagnostics.DebuggerStepThrough()> _
    Private Sub InitializeComponent()
        Dim resources As System.ComponentModel.ComponentResourceManager = New System.ComponentModel.ComponentResourceManager(GetType(frmRptUnpaidList))
        Me.CombProgram = New System.Windows.Forms.ComboBox()
        Me.Button2 = New System.Windows.Forms.Button()
        Me.GroupBox1 = New System.Windows.Forms.GroupBox()
        Me.RUnpaidStudentsList = New System.Windows.Forms.RadioButton()
        Me.RTotal = New System.Windows.Forms.RadioButton()
        Me.RProgram = New System.Windows.Forms.RadioButton()
        Me.Label1 = New System.Windows.Forms.Label()
        Me.DateTimePicker1 = New System.Windows.Forms.DateTimePicker()
        Me.CrystalReportViewer1 = New CrystalDecisions.Windows.Forms.CrystalReportViewer()
        Me.GroupBox1.SuspendLayout()
        Me.SuspendLayout()
        '
        'CombProgram
        '
        Me.CombProgram.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.CombProgram.AutoCompleteCustomSource.AddRange(New String() {""})
        Me.CombProgram.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList
        Me.CombProgram.ForeColor = System.Drawing.SystemColors.WindowText
        Me.CombProgram.FormattingEnabled = True
        Me.CombProgram.Location = New System.Drawing.Point(441, 40)
        Me.CombProgram.Name = "CombProgram"
        Me.CombProgram.Size = New System.Drawing.Size(200, 21)
        Me.CombProgram.TabIndex = 0
        '
        'Button2
        '
        Me.Button2.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.Button2.Location = New System.Drawing.Point(62, 93)
        Me.Button2.Name = "Button2"
        Me.Button2.Size = New System.Drawing.Size(75, 32)
        Me.Button2.TabIndex = 1
        Me.Button2.Text = "عرض"
        Me.Button2.UseVisualStyleBackColor = True
        '
        'GroupBox1
        '
        Me.GroupBox1.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.GroupBox1.Controls.Add(Me.RUnpaidStudentsList)
        Me.GroupBox1.Controls.Add(Me.RTotal)
        Me.GroupBox1.Controls.Add(Me.RProgram)
        Me.GroupBox1.Controls.Add(Me.CombProgram)
        Me.GroupBox1.Location = New System.Drawing.Point(143, 32)
        Me.GroupBox1.Name = "GroupBox1"
        Me.GroupBox1.Size = New System.Drawing.Size(801, 98)
        Me.GroupBox1.TabIndex = 0
        Me.GroupBox1.TabStop = False
        '
        'RUnpaidStudentsList
        '
        Me.RUnpaidStudentsList.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.RUnpaidStudentsList.AutoSize = True
        Me.RUnpaidStudentsList.Location = New System.Drawing.Point(561, 69)
        Me.RUnpaidStudentsList.Name = "RUnpaidStudentsList"
        Me.RUnpaidStudentsList.Size = New System.Drawing.Size(222, 17)
        Me.RUnpaidStudentsList.TabIndex = 31
        Me.RUnpaidStudentsList.Text = "كشف أسماء الطلاب المتخلفين عن  السداد"
        Me.RUnpaidStudentsList.UseVisualStyleBackColor = True
        '
        'RTotal
        '
        Me.RTotal.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.RTotal.AutoSize = True
        Me.RTotal.Checked = True
        Me.RTotal.Location = New System.Drawing.Point(649, 15)
        Me.RTotal.Name = "RTotal"
        Me.RTotal.Size = New System.Drawing.Size(134, 17)
        Me.RTotal.TabIndex = 28
        Me.RTotal.TabStop = True
        Me.RTotal.Text = "إجمالي متأخرات البرامج"
        Me.RTotal.UseVisualStyleBackColor = True
        '
        'RProgram
        '
        Me.RProgram.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.RProgram.AutoSize = True
        Me.RProgram.Location = New System.Drawing.Point(649, 42)
        Me.RProgram.Name = "RProgram"
        Me.RProgram.Size = New System.Drawing.Size(134, 17)
        Me.RProgram.TabIndex = 30
        Me.RProgram.Text = "كشف تفصيلي للبرنامج "
        Me.RProgram.UseVisualStyleBackColor = True
        '
        'Label1
        '
        Me.Label1.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.Label1.AutoSize = True
        Me.Label1.Font = New System.Drawing.Font("Times New Roman", 9.75!, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.Label1.Location = New System.Drawing.Point(845, 12)
        Me.Label1.Name = "Label1"
        Me.Label1.Size = New System.Drawing.Size(37, 15)
        Me.Label1.TabIndex = 29
        Me.Label1.Text = "في يوم"
        '
        'DateTimePicker1
        '
        Me.DateTimePicker1.Anchor = CType((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.DateTimePicker1.Font = New System.Drawing.Font("Tahoma", 9.75!, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, CType(0, Byte))
        Me.DateTimePicker1.Location = New System.Drawing.Point(584, 7)
        Me.DateTimePicker1.Name = "DateTimePicker1"
        Me.DateTimePicker1.Size = New System.Drawing.Size(255, 23)
        Me.DateTimePicker1.TabIndex = 0
        '
        'CrystalReportViewer1
        '
        Me.CrystalReportViewer1.ActiveViewIndex = -1
        Me.CrystalReportViewer1.Anchor = CType((((System.Windows.Forms.AnchorStyles.Top Or System.Windows.Forms.AnchorStyles.Bottom) _
            Or System.Windows.Forms.AnchorStyles.Left) _
            Or System.Windows.Forms.AnchorStyles.Right), System.Windows.Forms.AnchorStyles)
        Me.CrystalReportViewer1.BorderStyle = System.Windows.Forms.BorderStyle.FixedSingle
        Me.CrystalReportViewer1.Cursor = System.Windows.Forms.Cursors.Default
        Me.CrystalReportViewer1.Location = New System.Drawing.Point(9, 136)
        Me.CrystalReportViewer1.Name = "CrystalReportViewer1"
        Me.CrystalReportViewer1.Size = New System.Drawing.Size(935, 357)
        Me.CrystalReportViewer1.TabIndex = 2
        Me.CrystalReportViewer1.ToolPanelView = CrystalDecisions.Windows.Forms.ToolPanelViewType.None
        '
        'frmRptUnpaidList
        '
        Me.AutoScaleDimensions = New System.Drawing.SizeF(6.0!, 13.0!)
        Me.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font
        Me.ClientSize = New System.Drawing.Size(952, 497)
        Me.Controls.Add(Me.CrystalReportViewer1)
        Me.Controls.Add(Me.Button2)
        Me.Controls.Add(Me.Label1)
        Me.Controls.Add(Me.GroupBox1)
        Me.Controls.Add(Me.DateTimePicker1)
        Me.Icon = CType(resources.GetObject("$this.Icon"), System.Drawing.Icon)
        Me.MinimumSize = New System.Drawing.Size(947, 535)
        Me.Name = "frmRptUnpaidList"
        Me.RightToLeft = System.Windows.Forms.RightToLeft.Yes
        Me.StartPosition = System.Windows.Forms.FormStartPosition.CenterScreen
        Me.Text = "تقرير المتأخرات"
        Me.WindowState = System.Windows.Forms.FormWindowState.Maximized
        Me.GroupBox1.ResumeLayout(False)
        Me.GroupBox1.PerformLayout()
        Me.ResumeLayout(False)
        Me.PerformLayout()

    End Sub
    Friend WithEvents CombProgram As System.Windows.Forms.ComboBox
    Friend WithEvents Button2 As System.Windows.Forms.Button
    Friend WithEvents GroupBox1 As System.Windows.Forms.GroupBox
    Friend WithEvents RTotal As System.Windows.Forms.RadioButton
    Friend WithEvents RProgram As System.Windows.Forms.RadioButton
    Friend WithEvents Label1 As System.Windows.Forms.Label
    Friend WithEvents DateTimePicker1 As System.Windows.Forms.DateTimePicker
    Friend WithEvents CrystalReportViewer1 As CrystalDecisions.Windows.Forms.CrystalReportViewer
    Friend WithEvents RUnpaidStudentsList As System.Windows.Forms.RadioButton
End Class
