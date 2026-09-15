Imports System.Data.SqlClient
Public Class frmBillsArchive
    Inherits System.Windows.Forms.Form

#Region " Windows Form Designer generated code "

    Public Sub New()
        MyBase.New()

        'This call is required by the Windows Form Designer.
        InitializeComponent()

        'Add any initialization after the InitializeComponent() call

    End Sub

    'Form overrides dispose to clean up the component list.
    Protected Overloads Overrides Sub Dispose(ByVal disposing As Boolean)
        If disposing Then
            If Not (components Is Nothing) Then
                components.Dispose()
            End If
        End If
        MyBase.Dispose(disposing)
    End Sub

    'Required by the Windows Form Designer
    Private components As System.ComponentModel.IContainer

    'NOTE: The following procedure is required by the Windows Form Designer
    'It can be modified using the Windows Form Designer.  
    'Do not modify it using the code editor.
    Friend WithEvents ComboBox1 As System.Windows.Forms.ComboBox
    Friend WithEvents Label2 As System.Windows.Forms.Label
    Friend WithEvents GroupBox1 As System.Windows.Forms.GroupBox
    Friend WithEvents Label4 As System.Windows.Forms.Label
    Friend WithEvents Label5 As System.Windows.Forms.Label
    Friend WithEvents DateTimePicker1 As System.Windows.Forms.DateTimePicker
    Friend WithEvents DateTimePicker2 As System.Windows.Forms.DateTimePicker
    Friend WithEvents Button1 As System.Windows.Forms.Button
    Friend WithEvents DataGridView1 As System.Windows.Forms.DataGridView
    Friend WithEvents Button3 As System.Windows.Forms.Button
    <System.Diagnostics.DebuggerStepThrough()> Private Sub InitializeComponent()
        Dim resources As System.ComponentModel.ComponentResourceManager = New System.ComponentModel.ComponentResourceManager(GetType(frmBillsArchive))
        Me.ComboBox1 = New System.Windows.Forms.ComboBox
        Me.Label2 = New System.Windows.Forms.Label
        Me.GroupBox1 = New System.Windows.Forms.GroupBox
        Me.DateTimePicker2 = New System.Windows.Forms.DateTimePicker
        Me.DateTimePicker1 = New System.Windows.Forms.DateTimePicker
        Me.Label4 = New System.Windows.Forms.Label
        Me.Label5 = New System.Windows.Forms.Label
        Me.Button1 = New System.Windows.Forms.Button
        Me.Button3 = New System.Windows.Forms.Button
        Me.DataGridView1 = New System.Windows.Forms.DataGridView
        Me.GroupBox1.SuspendLayout()
        CType(Me.DataGridView1, System.ComponentModel.ISupportInitialize).BeginInit()
        Me.SuspendLayout()
        '
        'ComboBox1
        '
        Me.ComboBox1.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList
        Me.ComboBox1.DropDownWidth = 100
        Me.ComboBox1.Items.AddRange(New Object() {"ÓäÏ ÞÈÖ", "ÓäÏ ÏÝÚ"})
        Me.ComboBox1.Location = New System.Drawing.Point(533, 6)
        Me.ComboBox1.Name = "ComboBox1"
        Me.ComboBox1.Size = New System.Drawing.Size(120, 21)
        Me.ComboBox1.TabIndex = 62
        '
        'Label2
        '
        Me.Label2.AutoSize = True
        Me.Label2.Font = New System.Drawing.Font("Tahoma", 8.0!)
        Me.Label2.ImeMode = System.Windows.Forms.ImeMode.NoControl
        Me.Label2.Location = New System.Drawing.Point(659, 9)
        Me.Label2.Name = "Label2"
        Me.Label2.Size = New System.Drawing.Size(60, 13)
        Me.Label2.TabIndex = 61
        Me.Label2.Text = "äæÚ ÇáÓäÏ :"
        Me.Label2.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'GroupBox1
        '
        Me.GroupBox1.Controls.Add(Me.DateTimePicker2)
        Me.GroupBox1.Controls.Add(Me.DateTimePicker1)
        Me.GroupBox1.Controls.Add(Me.Label4)
        Me.GroupBox1.Controls.Add(Me.Label5)
        Me.GroupBox1.Location = New System.Drawing.Point(243, 29)
        Me.GroupBox1.Name = "GroupBox1"
        Me.GroupBox1.Size = New System.Drawing.Size(476, 51)
        Me.GroupBox1.TabIndex = 64
        Me.GroupBox1.TabStop = False
        Me.GroupBox1.Text = "ÇáÝÊÑÉ"
        '
        'DateTimePicker2
        '
        Me.DateTimePicker2.Location = New System.Drawing.Point(6, 16)
        Me.DateTimePicker2.Name = "DateTimePicker2"
        Me.DateTimePicker2.Size = New System.Drawing.Size(192, 20)
        Me.DateTimePicker2.TabIndex = 5
        '
        'DateTimePicker1
        '
        Me.DateTimePicker1.Location = New System.Drawing.Point(247, 16)
        Me.DateTimePicker1.Name = "DateTimePicker1"
        Me.DateTimePicker1.Size = New System.Drawing.Size(192, 20)
        Me.DateTimePicker1.TabIndex = 4
        '
        'Label4
        '
        Me.Label4.AutoSize = True
        Me.Label4.Font = New System.Drawing.Font("Tahoma", 8.0!)
        Me.Label4.Location = New System.Drawing.Point(200, 20)
        Me.Label4.Name = "Label4"
        Me.Label4.Size = New System.Drawing.Size(31, 13)
        Me.Label4.TabIndex = 3
        Me.Label4.Text = "Åáì :"
        Me.Label4.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'Label5
        '
        Me.Label5.AutoSize = True
        Me.Label5.Font = New System.Drawing.Font("Tahoma", 8.0!)
        Me.Label5.Location = New System.Drawing.Point(441, 20)
        Me.Label5.Name = "Label5"
        Me.Label5.Size = New System.Drawing.Size(28, 13)
        Me.Label5.TabIndex = 2
        Me.Label5.Text = "ãä :"
        Me.Label5.TextAlign = System.Drawing.ContentAlignment.MiddleCenter
        '
        'Button1
        '
        Me.Button1.Font = New System.Drawing.Font("Tahoma", 8.0!)
        Me.Button1.Location = New System.Drawing.Point(162, 45)
        Me.Button1.Name = "Button1"
        Me.Button1.Size = New System.Drawing.Size(75, 32)
        Me.Button1.TabIndex = 72
        Me.Button1.Text = "ÚÑÖ "
        '
        'Button3
        '
        Me.Button3.Font = New System.Drawing.Font("Tahoma", 8.0!)
        Me.Button3.Location = New System.Drawing.Point(644, 347)
        Me.Button3.Name = "Button3"
        Me.Button3.Size = New System.Drawing.Size(75, 32)
        Me.Button3.TabIndex = 74
        Me.Button3.Text = "ØÈÇÚÉ Çáßá"
        '
        'DataGridView1
        '
        Me.DataGridView1.AutoSizeColumnsMode = System.Windows.Forms.DataGridViewAutoSizeColumnsMode.Fill
        Me.DataGridView1.ColumnHeadersHeightSizeMode = System.Windows.Forms.DataGridViewColumnHeadersHeightSizeMode.AutoSize
        Me.DataGridView1.Location = New System.Drawing.Point(6, 86)
        Me.DataGridView1.MultiSelect = False
        Me.DataGridView1.Name = "DataGridView1"
        Me.DataGridView1.ReadOnly = True
        Me.DataGridView1.RowHeadersWidth = 50
        Me.DataGridView1.Size = New System.Drawing.Size(713, 255)
        Me.DataGridView1.TabIndex = 75
        '
        'frmBillsArchive
        '
        Me.AutoScaleBaseSize = New System.Drawing.Size(5, 13)
        Me.ClientSize = New System.Drawing.Size(725, 383)
        Me.Controls.Add(Me.DataGridView1)
        Me.Controls.Add(Me.Button3)
        Me.Controls.Add(Me.Button1)
        Me.Controls.Add(Me.GroupBox1)
        Me.Controls.Add(Me.ComboBox1)
        Me.Controls.Add(Me.Label2)
        Me.Icon = CType(resources.GetObject("$this.Icon"), System.Drawing.Icon)
        Me.MaximizeBox = False
        Me.MaximumSize = New System.Drawing.Size(733, 417)
        Me.MinimumSize = New System.Drawing.Size(733, 417)
        Me.Name = "frmBillsArchive"
        Me.RightToLeft = System.Windows.Forms.RightToLeft.Yes
        Me.SizeGripStyle = System.Windows.Forms.SizeGripStyle.Hide
        Me.StartPosition = System.Windows.Forms.FormStartPosition.CenterScreen
        Me.Text = "ÃÑÔíÝ ÓäÏÇÊ ÇáÏÝÚ / ÇáÞÈÖ"
        Me.GroupBox1.ResumeLayout(False)
        Me.GroupBox1.PerformLayout()
        CType(Me.DataGridView1, System.ComponentModel.ISupportInitialize).EndInit()
        Me.ResumeLayout(False)
        Me.PerformLayout()

    End Sub

#End Region

    Dim sno As Integer

    Private Sub Button1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button1.Click
        If Me.ComboBox1.SelectedIndex = -1 Then
            MsgBox("ÇáÑÌÇÁ ÊÍÏíÏ äæÚ ÇáÓäÏ")
            Exit Sub
        End If

        If Me.DateTimePicker1.Value > Me.DateTimePicker2.Value Then
            MsgBox("ÇáÑÌÇÁ ãÑÇÌÚÉ ÇáÝÊÑÉ")
            Exit Sub
        End If

        Dim strSel As String
        If Me.ComboBox1.SelectedIndex = 0 Then
            strSel = "Select SNO 'ÇáÑÞã',Source 'ÇáÌåÉ',Acc 'ÇáÍÓÇÈ ÇáÑÆíÓí',SubAcc 'ÇáÍÓÇÈ ÇáÝÑÚí',TotalValueIn 'ÇáãÈáÛ',TransDate 'ÇáÊÇÑíÎ' from Transactions " & _
                             " where transdate > N'" & Me.DateTimePicker1.Value.ToShortDateString & " 00:00:01'" & _
                             " and transdate < N'" & Me.DateTimePicker2.Value.ToShortDateString & " 23:59:59' and Done=1 and TransType=N'ÓäÏ ÞÈÖ'"
        ElseIf Me.ComboBox1.SelectedIndex = 1 Then
            strSel = "Select SNO 'ÇáÑÞã',Source 'ÇáÌåÉ',Acc 'ÇáÍÓÇÈ ÇáÑÆíÓí',SubAcc 'ÇáÍÓÇÈ ÇáÝÑÚí',TotalValueOut 'ÇáãÈáÛ',TransDate 'ÇáÊÇÑíÎ' from Transactions " & _
                 " where transdate > N'" & Me.DateTimePicker1.Value.ToShortDateString & " 00:00:01'" & _
                 " and transdate < N'" & Me.DateTimePicker2.Value.ToShortDateString & " 23:59:59' and Done=1 and TransType=N'ÓäÏ ÏÝÚ'"
        End If

        Try
            Dim dap As New SqlDataAdapter(strSel, cnn)
            Dim das As New DataSet

            cnn.Open()
            das.Clear()
            dap.Fill(das, "Transactions")
            cnn.Close()

            Me.DataGridView1.DataSource = das
            Me.DataGridView1.DataMember = "Transactions"

            Me.DataGridView1.Columns(0).Width = 40
        Catch ex As Exception
            MsgBox(ex.ToString)
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
        End Try
    End Sub

    Private Sub Button3_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button3.Click
        If Me.ComboBox1.SelectedIndex = -1 Then
            MsgBox("ÇáÑÌÇÁ ÊÍÏíÏ äæÚ ÇáÓäÏ")
            Exit Sub
        End If

        If Me.DateTimePicker1.Value > Me.DateTimePicker2.Value Then
            MsgBox("ÇáÑÌÇÁ ãÑÇÌÚÉ ÇáÝÊÑÉ")
            Exit Sub
        End If

        Dim strSel As String
        If Me.ComboBox1.SelectedIndex = 0 Then
            strSel = "Select SNO 'ÇáÑÞã',Source 'ÇáÌåÉ',Descr 'ÇáÈíÇä',Package 'ÇáÍÒãÉ',Acc 'ÇáÍÓÇÈ ÇáÑÆíÓí',SubAcc 'ÇáÍÓÇÈ ÇáÝÑÚí',TotalValueIn 'ÇáãÈáÛ',TransDate 'ÇáÊÇÑíÎ' from Transactions " & _
                             " where transdate > N'" & Me.DateTimePicker1.Value.ToShortDateString & " 00:00:01'" & _
                             " and transdate < N'" & Me.DateTimePicker2.Value.ToShortDateString & " 23:59:59' and Done=1 and TransType=N'ÓäÏ ÞÈÖ'"
        ElseIf Me.ComboBox1.SelectedIndex = 1 Then
            strSel = "Select SNO 'ÇáÑÞã',Source 'ÇáÌåÉ',Descr 'ÇáÈíÇä',Package 'ÇáÍÒãÉ',Acc 'ÇáÍÓÇÈ ÇáÑÆíÓí',SubAcc 'ÇáÍÓÇÈ ÇáÝÑÚí',TotalValueOut 'ÇáãÈáÛ',TransDate 'ÇáÊÇÑíÎ' from Transactions " & _
                 " where transdate > N'" & Me.DateTimePicker1.Value.ToShortDateString & " 00:00:01'" & _
                 " and transdate < N'" & Me.DateTimePicker2.Value.ToShortDateString & " 23:59:59' and Done=1 and TransType=N'ÓäÏ ÏÝÚ'"
        End If

        Try
            Me.Cursor = Cursors.WaitCursor
            Dim dap As New SqlDataAdapter(strSel, cnn)
            Dim das As New DataSet

            cnn.Open()
            das.Clear()
            dap.Fill(das, "Transactions")
            cnn.Close()

            Me.DataGridView1.DataSource = das
            Me.DataGridView1.DataMember = "Transactions"

            Dim strSel1 As String
            strSel1 = "Select TransType,SNO,Source,Descr,Package,Acc,SubAcc,TotalValueIN+TotalValueOut TotalValueIN,TransDate from Transactions " & _
                             " where transdate > N'" & Me.DateTimePicker1.Value.ToShortDateString & " 00:00:01'" & _
                             " and transdate < N'" & Me.DateTimePicker2.Value.ToShortDateString & " 23:59:59' and TransType=N'" & Me.ComboBox1.SelectedItem & "'"

            Dim dap1 As New SqlDataAdapter(strSel1, cnn)
            Dim das1 As New DataSet

            cnn.Open()
            das1.Clear()
            dap1.Fill(das1, "Transactions")
            cnn.Close()

            Dim rpt As New BillsArchive
            rpt.SetDataSource(das1)
            RptViewer.CrystalReportViewer2.ReportSource = rpt
            RptViewer.CrystalReportViewer2.RefreshReport()
            RptViewer.ShowDialog()
            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            MsgBox(ex.ToString)
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
        End Try
        Me.Cursor = Cursors.Default
    End Sub

    Private Sub DataGridView1_DoubleClick(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles DataGridView1.DoubleClick
        Try
            Select Case Me.ComboBox1.SelectedIndex
                Case 0 'ÓäÏ ÞÈÖ
                    PrintBill("ÓäÏ ÞÈÖ", CInt(Me.DataGridView1.SelectedRows.Item(0).Cells(0).Value))
                Case 1 'ÓäÏ ÏÝÚ
                    PrintBill("ÓäÏ ÏÝÚ", CInt(Me.DataGridView1.SelectedRows.Item(0).Cells(0).Value))
            End Select
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub
End Class
